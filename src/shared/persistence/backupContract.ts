import { INDEXED_DB_SCHEMA_VERSION, INDEXED_DB_STORES } from "./indexeddbSchema"
import type { IndexedDbStoreName } from "./indexeddbSchema"

export const BACKUP_FILE_EXTENSION = ".tradgio-backup"
export const BACKUP_MAGIC = "TRADGIO_BACKUP"
export const BACKUP_FORMAT_VERSION = 1

export const BACKUP_CRYPTO = {
  kdf: "PBKDF2",
  hash: "SHA-256",
  iterations: 600_000,
  saltBytes: 16,
  cipher: "AES-GCM",
  keyLength: 256,
  ivBytes: 12,
  tagLength: 128,
} as const

export const BACKUP_COMPRESSION = "gzip" as const
export const BACKUP_SERIALIZATION = "json-utf8" as const
export const BACKUP_DIGEST = "SHA-256" as const
export const BACKUP_PASSWORD_MIN_LENGTH = 12

export const BACKUP_STORES = Object.freeze(
  [...Object.values(INDEXED_DB_STORES)].sort()
) as readonly IndexedDbStoreName[]

export type BackupEnvelopeHeader = {
  magic: typeof BACKUP_MAGIC
  formatVersion: typeof BACKUP_FORMAT_VERSION
  applicationVersion: string
  schemaVersion: number
  createdAt: string
  serialization: typeof BACKUP_SERIALIZATION
  compression: typeof BACKUP_COMPRESSION
  kdf: {
    name: typeof BACKUP_CRYPTO.kdf
    hash: typeof BACKUP_CRYPTO.hash
    iterations: number
    saltBase64: string
  }
  cipher: {
    name: typeof BACKUP_CRYPTO.cipher
    keyLength: typeof BACKUP_CRYPTO.keyLength
    ivBase64: string
    tagLength: typeof BACKUP_CRYPTO.tagLength
  }
}

export type BackupEnvelopeHeaderCandidate = {
  magic: string
  formatVersion: number
  applicationVersion: string
  schemaVersion: number
  createdAt: string
  serialization: string
  compression: string
  kdf: {
    name: string
    hash: string
    iterations: number
    saltBase64: string
  }
  cipher: {
    name: string
    keyLength: number
    ivBase64: string
    tagLength: number
  }
}

export type BackupEnvelope = {
  header: BackupEnvelopeHeader
  ciphertext: Uint8Array
}

export type BackupStoreSummary = {
  store: IndexedDbStoreName
  recordCount: number
  serializedBytes: number
  sha256: string
}

export type BackupAttachmentSummary = {
  count: number
  totalBytes: number
}

export type BackupBusinessTotals = {
  purchaseAmountMinor: number
  salesAmountMinor: number
  quoteAmountMinor: number
  stockQuantity: number
}

export type BackupManifest = {
  formatVersion: typeof BACKUP_FORMAT_VERSION
  applicationVersion: string
  schemaVersion: number
  createdAt: string
  stores: BackupStoreSummary[]
  attachments: BackupAttachmentSummary
  totals: BackupBusinessTotals
  contentSha256: string
}

export type SerializedAttachmentBlob = {
  id: string
  accountId: string
  mimeType: string
  size: number
  sha256: string
  bytesBase64: string
}

export type BackupStoreData = Omit<
  Record<IndexedDbStoreName, unknown[]>,
  typeof INDEXED_DB_STORES.attachmentBlobs
> & {
  attachmentBlobs: SerializedAttachmentBlob[]
}

export type BackupArchive = {
  manifest: BackupManifest
  stores: BackupStoreData
}

export type BackupCompatibility =
  | { compatible: true }
  | {
      compatible: false
      reason:
        | "INVALID_MAGIC"
        | "FORMAT_TOO_OLD"
        | "FORMAT_TOO_NEW"
        | "SCHEMA_TOO_NEW"
        | "UNSUPPORTED_CRYPTO"
    }

export function checkBackupCompatibility(
  formatVersion: number,
  schemaVersion: number
): BackupCompatibility {
  if (formatVersion < BACKUP_FORMAT_VERSION) {
    return { compatible: false, reason: "FORMAT_TOO_OLD" }
  }
  if (formatVersion > BACKUP_FORMAT_VERSION) {
    return { compatible: false, reason: "FORMAT_TOO_NEW" }
  }
  if (schemaVersion > INDEXED_DB_SCHEMA_VERSION) {
    return { compatible: false, reason: "SCHEMA_TOO_NEW" }
  }
  return { compatible: true }
}

export function checkBackupHeaderCompatibility(
  header: BackupEnvelopeHeaderCandidate
): BackupCompatibility {
  if (header.magic !== BACKUP_MAGIC) {
    return { compatible: false, reason: "INVALID_MAGIC" }
  }

  const versionCompatibility = checkBackupCompatibility(header.formatVersion, header.schemaVersion)
  if (!versionCompatibility.compatible) {
    return versionCompatibility
  }

  if (
    header.serialization !== BACKUP_SERIALIZATION ||
    header.compression !== BACKUP_COMPRESSION ||
    header.kdf.name !== BACKUP_CRYPTO.kdf ||
    header.kdf.hash !== BACKUP_CRYPTO.hash ||
    header.kdf.iterations !== BACKUP_CRYPTO.iterations ||
    header.cipher.name !== BACKUP_CRYPTO.cipher ||
    header.cipher.keyLength !== BACKUP_CRYPTO.keyLength ||
    header.cipher.tagLength !== BACKUP_CRYPTO.tagLength
  ) {
    return { compatible: false, reason: "UNSUPPORTED_CRYPTO" }
  }

  return { compatible: true }
}

export type RestoreCapacityInput = {
  usage: number
  quota: number
  currentDatabaseBytes: number
  incomingArchiveBytes: number
}

export type RestoreCapacityResult = {
  allowed: boolean
  projectedUsageRatio: number
  requiredWorkingBytes: number
}

const RESTORE_FIXED_OVERHEAD_BYTES = 16 * 1024 * 1024
const RESTORE_OVERHEAD_RATIO = 0.2
const RESTORE_BLOCK_RATIO = 0.85

export function evaluateRestoreCapacity(input: RestoreCapacityInput): RestoreCapacityResult {
  const replacementBytes = Math.max(input.currentDatabaseBytes, input.incomingArchiveBytes)
  const requiredWorkingBytes = Math.ceil(
    input.incomingArchiveBytes +
      replacementBytes * RESTORE_OVERHEAD_RATIO +
      RESTORE_FIXED_OVERHEAD_BYTES
  )
  const projectedUsageRatio =
    input.quota > 0 ? (input.usage + requiredWorkingBytes) / input.quota : 1

  return {
    allowed: input.quota > 0 && projectedUsageRatio < RESTORE_BLOCK_RATIO,
    projectedUsageRatio,
    requiredWorkingBytes,
  }
}

export type RestorePhase =
  | "selecting-file"
  | "entering-password"
  | "decrypting"
  | "validating"
  | "previewing"
  | "confirming"
  | "creating-snapshot"
  | "restoring"
  | "verifying"
  | "completed"
  | "failed"

const RESTORE_TRANSITIONS: Record<RestorePhase, readonly RestorePhase[]> = {
  "selecting-file": ["entering-password", "failed"],
  "entering-password": ["decrypting", "failed"],
  decrypting: ["validating", "failed"],
  validating: ["previewing", "failed"],
  previewing: ["confirming", "failed"],
  confirming: ["creating-snapshot", "failed"],
  "creating-snapshot": ["restoring", "failed"],
  restoring: ["verifying", "failed"],
  verifying: ["completed", "failed"],
  completed: [],
  failed: [],
}

export function canTransitionRestore(from: RestorePhase, to: RestorePhase): boolean {
  return RESTORE_TRANSITIONS[from].includes(to)
}

export function restoreMayWriteDatabase(phase: RestorePhase): boolean {
  return phase === "restoring"
}

export type RestorePreview = {
  accountCount: number
  storeSummaries: BackupStoreSummary[]
  attachments: BackupAttachmentSummary
  totals: BackupBusinessTotals
  generatedAt: string
  sourceApplicationVersion: string
  sourceSchemaVersion: number
}

export function buildRestorePreview(archive: BackupArchive): RestorePreview {
  return {
    accountCount: archive.stores.accounts?.length ?? 0,
    storeSummaries: archive.manifest.stores,
    attachments: archive.manifest.attachments,
    totals: archive.manifest.totals,
    generatedAt: archive.manifest.createdAt,
    sourceApplicationVersion: archive.manifest.applicationVersion,
    sourceSchemaVersion: archive.manifest.schemaVersion,
  }
}
