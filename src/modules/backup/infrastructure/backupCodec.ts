import {
  BACKUP_COMPRESSION,
  BACKUP_CRYPTO,
  BACKUP_FORMAT_VERSION,
  BACKUP_MAGIC,
  BACKUP_SERIALIZATION,
  checkBackupHeaderCompatibility,
  type BackupArchive,
  type BackupEnvelope,
  type BackupEnvelopeHeader,
  type BackupEnvelopeHeaderCandidate,
} from "../../../shared/persistence"
import { DEFAULT_RUNTIME_CONFIG, PlatformAdapterError } from "../../../shared/platform"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalize(item)])
    )
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new PlatformAdapterError("BACKUP_INVALID", "备份数据包含无效数字")
  }
  if (value === undefined) {
    throw new PlatformAdapterError("BACKUP_INVALID", "备份数据包含 undefined")
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
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
    throw new PlatformAdapterError("BACKUP_INVALID", "备份包头编码无效", error)
  }
}

async function transformBytes(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  const output = new Response(stream.readable).arrayBuffer()
  await writer.write(bytes as Uint8Array<ArrayBuffer>)
  await writer.close()
  return new Uint8Array(await output)
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  cryptoApi: Crypto
): Promise<CryptoKey> {
  const material = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: BACKUP_CRYPTO.hash,
      iterations: BACKUP_CRYPTO.iterations,
      salt: salt as Uint8Array<ArrayBuffer>,
    },
    material,
    { name: "AES-GCM", length: BACKUP_CRYPTO.keyLength },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptArchive(
  archive: BackupArchive,
  password: string,
  options: { crypto?: Crypto; createdAt?: string } = {}
): Promise<BackupEnvelope> {
  const cryptoApi = options.crypto ?? crypto
  const salt = cryptoApi.getRandomValues(new Uint8Array(BACKUP_CRYPTO.saltBytes))
  const iv = cryptoApi.getRandomValues(new Uint8Array(BACKUP_CRYPTO.ivBytes))
  const header: BackupEnvelopeHeader = {
    magic: BACKUP_MAGIC,
    formatVersion: BACKUP_FORMAT_VERSION,
    applicationVersion: DEFAULT_RUNTIME_CONFIG.appVersion,
    schemaVersion: DEFAULT_RUNTIME_CONFIG.schemaVersion,
    createdAt: options.createdAt ?? archive.manifest.createdAt,
    serialization: BACKUP_SERIALIZATION,
    compression: BACKUP_COMPRESSION,
    kdf: {
      name: BACKUP_CRYPTO.kdf,
      hash: BACKUP_CRYPTO.hash,
      iterations: BACKUP_CRYPTO.iterations,
      saltBase64: bytesToBase64(salt),
    },
    cipher: {
      name: BACKUP_CRYPTO.cipher,
      keyLength: BACKUP_CRYPTO.keyLength,
      ivBase64: bytesToBase64(iv),
      tagLength: BACKUP_CRYPTO.tagLength,
    },
  }
  const headerBytes = encoder.encode(canonicalJson(header))
  const archiveBytes = encoder.encode(canonicalJson(archive))
  const compressed = await transformBytes(archiveBytes, new CompressionStream("gzip"))
  const key = await deriveKey(password, salt, cryptoApi)
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as Uint8Array<ArrayBuffer>,
      additionalData: headerBytes as Uint8Array<ArrayBuffer>,
      tagLength: BACKUP_CRYPTO.tagLength,
    },
    key,
    compressed as Uint8Array<ArrayBuffer>
  )
  return { header, ciphertext: new Uint8Array(encrypted) }
}

export function encodeEnvelope(envelope: BackupEnvelope): Uint8Array {
  const headerBytes = encoder.encode(canonicalJson(envelope.header))
  const bytes = new Uint8Array(4 + headerBytes.length + envelope.ciphertext.length)
  new DataView(bytes.buffer).setUint32(0, headerBytes.length, false)
  bytes.set(headerBytes, 4)
  bytes.set(envelope.ciphertext, 4 + headerBytes.length)
  return bytes
}

export function decodeEnvelope(bytes: Uint8Array): BackupEnvelope {
  if (bytes.length < 5) {
    throw new PlatformAdapterError("BACKUP_INVALID", "备份文件长度无效")
  }
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    0,
    false
  )
  if (headerLength < 2 || 4 + headerLength >= bytes.length) {
    throw new PlatformAdapterError("BACKUP_INVALID", "备份文件包头长度无效")
  }
  let header: BackupEnvelopeHeaderCandidate
  try {
    header = JSON.parse(decoder.decode(bytes.subarray(4, 4 + headerLength)))
  } catch (error) {
    throw new PlatformAdapterError("BACKUP_INVALID", "备份文件包头无效", error)
  }
  const compatibility = checkBackupHeaderCompatibility(header)
  if (!compatibility.compatible) {
    throw new PlatformAdapterError(
      "BACKUP_VERSION_UNSUPPORTED",
      compatibility.reason === "SCHEMA_TOO_NEW"
        ? "备份数据库版本高于当前应用，请升级应用后重试"
        : "备份格式或加密参数不受支持"
    )
  }
  return {
    header: header as BackupEnvelopeHeader,
    ciphertext: bytes.slice(4 + headerLength),
  }
}

export async function decryptEnvelope(
  envelope: BackupEnvelope,
  password: string,
  cryptoApi: Crypto = crypto
): Promise<BackupArchive> {
  try {
    const headerBytes = encoder.encode(canonicalJson(envelope.header))
    const salt = base64ToBytes(envelope.header.kdf.saltBase64)
    const iv = base64ToBytes(envelope.header.cipher.ivBase64)
    if (salt.length !== BACKUP_CRYPTO.saltBytes || iv.length !== BACKUP_CRYPTO.ivBytes) {
      throw new Error("invalid crypto parameters")
    }
    const key = await deriveKey(password, salt, cryptoApi)
    const decrypted = await cryptoApi.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as Uint8Array<ArrayBuffer>,
        additionalData: headerBytes as Uint8Array<ArrayBuffer>,
        tagLength: BACKUP_CRYPTO.tagLength,
      },
      key,
      envelope.ciphertext as Uint8Array<ArrayBuffer>
    )
    const archiveBytes = await transformBytes(
      new Uint8Array(decrypted),
      new DecompressionStream("gzip")
    )
    return JSON.parse(decoder.decode(archiveBytes)) as BackupArchive
  } catch (error) {
    if (error instanceof PlatformAdapterError) throw error
    throw new PlatformAdapterError(
      "BACKUP_PASSWORD_OR_INTEGRITY_FAILED",
      "备份密码错误或文件已损坏",
      error
    )
  }
}
