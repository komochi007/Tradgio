import {
  BACKUP_FILE_EXTENSION,
  BACKUP_PASSWORD_MIN_LENGTH,
  BACKUP_STORES,
  INDEXED_DB_SCHEMA,
  INDEXED_DB_STORES,
  buildRestorePreview,
  evaluateRestoreCapacity,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
  type BackupArchive,
  type BackupBusinessTotals,
  type BackupStoreData,
  type BackupStoreSummary,
  type IndexedDbStoreName,
  type RestorePreview,
  type SerializedAttachmentBlob,
} from "../../../shared/persistence"
import { DEFAULT_RUNTIME_CONFIG, PlatformAdapterError } from "../../../shared/platform"
import {
  canonicalJson,
  decodeEnvelope,
  decryptEnvelope,
  encodeEnvelope,
  encryptArchive,
} from "../infrastructure/backupCodec"

const SESSION_KEY = "tradgio_session"
const encoder = new TextEncoder()

type BackupServiceOptions = {
  databaseFactory?: IDBFactory
  crypto?: Crypto
  storage?: Storage
  estimateStorage?: () => Promise<StorageEstimate>
  now?: () => Date
}

export type BackupFile = {
  bytes: Uint8Array
  filename: string
  preview: RestorePreview
  archive: BackupArchive
}

export type RestoreInspection = {
  archive: BackupArchive
  preview: RestorePreview
  sourceSha256: string
  requiredWorkingBytes: number
  projectedUsageRatio: number
}

export type RestoreReport = {
  startedAt: string
  completedAt: string
  sourceFilename: string
  sourceSha256: string
  snapshotFilename: string
  storeSummaries: BackupStoreSummary[]
  attachments: BackupArchive["manifest"]["attachments"]
  totals: BackupBusinessTotals
  status: "completed"
}

type AttachmentBlobRecord = { id: string; accountId: string; blob: Blob }

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("操作已取消", "AbortError")
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  } catch (error) {
    throw new PlatformAdapterError("BACKUP_INVALID", "附件 Base64 编码无效", error)
  }
}

function stableRecordKey(store: IndexedDbStoreName, record: unknown): string {
  const definition = INDEXED_DB_SCHEMA.find((item) => item.name === store)
  const source = record as Record<string, unknown>
  const values = Array.isArray(definition?.keyPath)
    ? definition.keyPath.map((key) => source[key])
    : [source[String(definition?.keyPath ?? "id")]]
  return canonicalJson(values)
}

function sortStore(store: IndexedDbStoreName, records: unknown[]): unknown[] {
  return [...records].sort((left, right) => {
    const leftKey = stableRecordKey(store, left)
    const rightKey = stableRecordKey(store, right)
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}

function sumAmount(records: unknown[]): number {
  return Math.round(
    records.reduce<number>((sum, record) => {
      const amount = Number((record as { totalAmount?: unknown }).totalAmount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0) * 100
  )
}

function sumStock(records: unknown[]): number {
  return records.reduce<number>((sum, record) => {
    const quantity = Number((record as { quantity?: unknown }).quantity)
    return sum + (Number.isFinite(quantity) ? quantity : 0)
  }, 0)
}

export class BackupService {
  private readonly databaseFactory: IDBFactory
  private readonly cryptoApi: Crypto
  private readonly storage: Storage
  private readonly estimateStorage: () => Promise<StorageEstimate>
  private readonly now: () => Date

  constructor(options: BackupServiceOptions = {}) {
    this.databaseFactory = options.databaseFactory ?? indexedDB
    this.cryptoApi = options.crypto ?? crypto
    this.storage = options.storage ?? localStorage
    this.estimateStorage = options.estimateStorage ?? (() => navigator.storage.estimate())
    this.now = options.now ?? (() => new Date())
  }

  async createBackup(password: string, signal?: AbortSignal): Promise<BackupFile> {
    this.validatePassword(password)
    ensureNotAborted(signal)
    const archive = await this.readArchive(signal)
    await this.validateArchive(archive)
    const envelope = await encryptArchive(archive, password, {
      crypto: this.cryptoApi,
      createdAt: archive.manifest.createdAt,
    })
    const date = archive.manifest.createdAt.slice(0, 10).replaceAll("-", "")
    return {
      bytes: encodeEnvelope(envelope),
      filename: `tradgio-backup-${date}-v${archive.manifest.applicationVersion}${BACKUP_FILE_EXTENSION}`,
      preview: buildRestorePreview(archive),
      archive,
    }
  }

  async inspectBackup(
    bytes: Uint8Array,
    password: string,
    signal?: AbortSignal
  ): Promise<RestoreInspection> {
    ensureNotAborted(signal)
    const envelope = decodeEnvelope(bytes)
    const archive = await decryptEnvelope(envelope, password, this.cryptoApi)
    if (
      archive.manifest.formatVersion !== envelope.header.formatVersion ||
      archive.manifest.applicationVersion !== envelope.header.applicationVersion ||
      archive.manifest.schemaVersion !== envelope.header.schemaVersion ||
      archive.manifest.createdAt !== envelope.header.createdAt
    ) {
      throw new PlatformAdapterError("BACKUP_INVALID", "备份包头与 Manifest 不一致")
    }
    await this.validateArchive(archive)
    const estimate = await this.estimateStorage()
    const currentDatabaseBytes = await this.estimateCurrentDatabaseBytes()
    const incomingArchiveBytes = encoder.encode(canonicalJson(archive)).length
    const capacity = evaluateRestoreCapacity({
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
      currentDatabaseBytes,
      incomingArchiveBytes,
    })
    if (!capacity.allowed) {
      throw new PlatformAdapterError(
        "QUOTA_EXCEEDED",
        estimate.quota ? "本地存储空间不足，无法安全恢复" : "无法获取存储容量，已阻止恢复"
      )
    }
    return {
      archive,
      preview: buildRestorePreview(archive),
      sourceSha256: await this.digest(bytes),
      requiredWorkingBytes: capacity.requiredWorkingBytes,
      projectedUsageRatio: capacity.projectedUsageRatio,
    }
  }

  async restoreBackup(input: {
    inspection: RestoreInspection
    password: string
    sourceFilename: string
    downloadSnapshot: (file: BackupFile) => Promise<void>
    signal?: AbortSignal
  }): Promise<RestoreReport> {
    const startedAt = this.now().toISOString()
    ensureNotAborted(input.signal)
    const snapshot = await this.createBackup(input.password, input.signal)
    snapshot.filename = snapshot.filename.replace(
      BACKUP_FILE_EXTENSION,
      `.pre-restore${BACKUP_FILE_EXTENSION}`
    )
    await input.downloadSnapshot(snapshot)
    ensureNotAborted(input.signal)
    await this.replaceDatabase(input.inspection.archive)
    const restored = await this.readArchive(input.signal)
    if (restored.manifest.contentSha256 !== input.inspection.archive.manifest.contentSha256) {
      throw new PlatformAdapterError(
        "BACKUP_INVALID",
        "恢复后数据核对失败，请立即使用恢复前快照还原"
      )
    }
    this.storage.removeItem(SESSION_KEY)
    return {
      startedAt,
      completedAt: this.now().toISOString(),
      sourceFilename: input.sourceFilename,
      sourceSha256: input.inspection.sourceSha256,
      snapshotFilename: snapshot.filename,
      storeSummaries: restored.manifest.stores,
      attachments: restored.manifest.attachments,
      totals: restored.manifest.totals,
      status: "completed",
    }
  }

  private validatePassword(password: string) {
    if ([...password].length < BACKUP_PASSWORD_MIN_LENGTH) {
      throw new PlatformAdapterError(
        "BACKUP_INVALID",
        `备份密码至少需要 ${BACKUP_PASSWORD_MIN_LENGTH} 个字符`
      )
    }
  }

  private async digest(bytes: Uint8Array): Promise<string> {
    return toHex(
      new Uint8Array(
        await this.cryptoApi.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>)
      )
    )
  }

  private async readArchive(signal?: AbortSignal): Promise<BackupArchive> {
    const database = await openTradgioDatabase(this.databaseFactory)
    try {
      const transaction = database.transaction([...BACKUP_STORES], "readonly")
      const completion = transactionToPromise(transaction)
      const stores = {} as BackupStoreData
      const snapshots = await Promise.all(
        BACKUP_STORES.map(async (storeName) => {
          const records = (await requestToPromise(
            transaction.objectStore(storeName).getAll()
          )) as unknown[]
          return [storeName, records] as const
        })
      )
      await completion
      for (const [storeName, records] of snapshots) {
        ensureNotAborted(signal)
        if (storeName === INDEXED_DB_STORES.attachmentBlobs) {
          const serialized: SerializedAttachmentBlob[] = []
          for (const record of records as AttachmentBlobRecord[]) {
            const bytes = new Uint8Array(await record.blob.arrayBuffer())
            serialized.push({
              id: record.id,
              accountId: record.accountId,
              mimeType: record.blob.type || "application/octet-stream",
              size: bytes.length,
              sha256: await this.digest(bytes),
              bytesBase64: bytesToBase64(bytes),
            })
          }
          stores[storeName] = sortStore(storeName, serialized) as SerializedAttachmentBlob[]
        } else {
          stores[storeName] = sortStore(storeName, records) as never
        }
      }
      return this.buildArchive(stores, this.now().toISOString())
    } finally {
      database.close()
    }
  }

  private async buildArchive(stores: BackupStoreData, createdAt: string): Promise<BackupArchive> {
    const summaries: BackupStoreSummary[] = []
    for (const store of BACKUP_STORES) {
      const json = canonicalJson(stores[store])
      summaries.push({
        store,
        recordCount: stores[store].length,
        serializedBytes: encoder.encode(json).length,
        sha256: await this.digest(encoder.encode(json)),
      })
    }
    const attachmentBlobs = stores.attachmentBlobs
    const totals = {
      purchaseAmountMinor: sumAmount(stores.purchaseOrders),
      salesAmountMinor: sumAmount(stores.salesOrders),
      quoteAmountMinor: sumAmount(stores.quoteOrders),
      stockQuantity: sumStock(stores.inventorySnapshots),
    }
    return {
      manifest: {
        formatVersion: 1,
        applicationVersion: DEFAULT_RUNTIME_CONFIG.appVersion,
        schemaVersion: DEFAULT_RUNTIME_CONFIG.schemaVersion,
        createdAt,
        stores: summaries,
        attachments: {
          count: attachmentBlobs.length,
          totalBytes: attachmentBlobs.reduce((sum, item) => sum + item.size, 0),
        },
        totals,
        contentSha256: await this.digest(encoder.encode(canonicalJson(stores))),
      },
      stores,
    }
  }

  private async validateArchive(archive: BackupArchive): Promise<void> {
    if (
      archive.manifest.formatVersion !== 1 ||
      archive.manifest.schemaVersion > DEFAULT_RUNTIME_CONFIG.schemaVersion
    ) {
      throw new PlatformAdapterError("BACKUP_VERSION_UNSUPPORTED", "备份版本不受支持")
    }
    if (!archive.manifest.applicationVersion || !archive.manifest.createdAt) {
      throw new PlatformAdapterError("BACKUP_INVALID", "备份 Manifest 与当前格式不一致")
    }
    const storeNames = Object.keys(archive.stores).sort()
    if (canonicalJson(storeNames) !== canonicalJson([...BACKUP_STORES])) {
      throw new PlatformAdapterError("BACKUP_INVALID", "备份未包含完整数据库 store")
    }
    const rebuilt = await this.buildArchive(archive.stores, archive.manifest.createdAt)
    if (
      rebuilt.manifest.contentSha256 !== archive.manifest.contentSha256 ||
      canonicalJson(rebuilt.manifest.stores) !== canonicalJson(archive.manifest.stores) ||
      canonicalJson(rebuilt.manifest.attachments) !== canonicalJson(archive.manifest.attachments) ||
      canonicalJson(rebuilt.manifest.totals) !== canonicalJson(archive.manifest.totals)
    ) {
      throw new PlatformAdapterError("BACKUP_INVALID", "备份摘要或统计校验失败")
    }
    const accountIds = new Set(
      archive.stores.accounts.map((record) => String((record as { id?: unknown }).id))
    )
    for (const definition of INDEXED_DB_SCHEMA.filter((item) => item.accountScoped)) {
      for (const record of archive.stores[definition.name]) {
        if (!accountIds.has(String((record as { accountId?: unknown }).accountId))) {
          throw new PlatformAdapterError("BACKUP_INVALID", `${definition.name} 存在无效账号引用`)
        }
      }
    }
    const metadataIds = new Set(
      archive.stores.attachmentMetadata.map((item) => String((item as { id?: unknown }).id))
    )
    const blobIds = new Set(archive.stores.attachmentBlobs.map((item) => item.id))
    if (canonicalJson([...metadataIds].sort()) !== canonicalJson([...blobIds].sort())) {
      throw new PlatformAdapterError("BACKUP_INVALID", "附件元数据与二进制不一致")
    }
    for (const item of archive.stores.attachmentBlobs) {
      const bytes = base64ToBytes(item.bytesBase64)
      if (bytes.length !== item.size || (await this.digest(bytes)) !== item.sha256) {
        throw new PlatformAdapterError("BACKUP_INVALID", `附件 ${item.id} 完整性校验失败`)
      }
    }
  }

  private async estimateCurrentDatabaseBytes(): Promise<number> {
    const archive = await this.readArchive()
    return encoder.encode(canonicalJson(archive)).length
  }

  private async replaceDatabase(archive: BackupArchive): Promise<void> {
    await this.validateArchive(archive)
    const database = await openTradgioDatabase(this.databaseFactory)
    const transaction = database.transaction([...BACKUP_STORES], "readwrite")
    const completion = transactionToPromise(transaction)
    try {
      for (const storeName of BACKUP_STORES) {
        const store = transaction.objectStore(storeName)
        await requestToPromise(store.clear())
        for (const record of archive.stores[storeName]) {
          const value =
            storeName === INDEXED_DB_STORES.attachmentBlobs
              ? (() => {
                  const serialized = record as SerializedAttachmentBlob
                  const bytes = base64ToBytes(serialized.bytesBase64)
                  const buffer = bytes.buffer.slice(
                    bytes.byteOffset,
                    bytes.byteOffset + bytes.byteLength
                  ) as ArrayBuffer
                  return {
                    id: serialized.id,
                    accountId: serialized.accountId,
                    blob: new Blob([buffer], { type: serialized.mimeType }),
                  }
                })()
              : record
          await requestToPromise(store.add(value))
        }
      }
      await completion
    } catch (error) {
      try {
        transaction.abort()
      } catch {}
      await completion.catch(() => undefined)
      throw new PlatformAdapterError("TRANSACTION_ABORTED", "整机恢复事务失败，原数据未修改", error)
    } finally {
      database.close()
    }
  }
}

export const backupService = new BackupService()
