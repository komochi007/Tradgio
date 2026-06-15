import type { AuthService } from "../../modules/auth/domain/AuthService"
import type { ExportFormat, ExportPayload } from "../../modules/export-service/domain/types"
import type { BackupArchive, BackupEnvelope, RestorePreview } from "../persistence/backupContract"
import type {
  IndexedDbStoreName,
  PersistenceTransaction,
  TransactionRunner,
} from "../persistence/indexeddbSchema"
import type { AttachmentMetadata, FileSaveInput } from "../persistence/types"
import type { Repository, RepositoryCreateInput } from "../query"

export type AdapterOperationOptions = {
  signal?: AbortSignal
  transaction?: PersistenceTransaction
}

export type TransactionalOperationOptions = AdapterOperationOptions & {
  transaction: PersistenceTransaction
}

export interface AccountContextAdapter {
  getCurrentAccountId(): string | null
  requireCurrentAccountId(): string
}

export interface LocalAuthAdapter extends AuthService {
  migrateLegacyCredential(password: string, options?: AdapterOperationOptions): Promise<boolean>
}

export interface LocalDataAdapter<
  T extends { id: string; accountId: string },
> extends Repository<T> {
  create(item: RepositoryCreateInput<T>, options?: AdapterOperationOptions): Promise<T>
  update(id: string, patch: Partial<T>, options?: AdapterOperationOptions): Promise<T>
  remove(id: string, options?: AdapterOperationOptions): Promise<void>
}

export interface DataAdapterFactory {
  forStore<T extends { id: string; accountId: string }>(
    store: IndexedDbStoreName
  ): LocalDataAdapter<T>
}

export interface LocalFileAdapter {
  save(input: FileSaveInput, options: TransactionalOperationOptions): Promise<AttachmentMetadata>
  getMetadata(
    attachmentId: string,
    options?: AdapterOperationOptions
  ): Promise<AttachmentMetadata | undefined>
  download(attachmentId: string, options?: AdapterOperationOptions): Promise<Blob>
  remove(attachmentId: string, options: TransactionalOperationOptions): Promise<void>
}

export type StorageEstimate = {
  usage: number
  quota: number
  usageRatio: number
  persisted: boolean | null
}

export interface StorageAdapter {
  estimate(options?: AdapterOperationOptions): Promise<StorageEstimate>
  requestPersistence(options?: AdapterOperationOptions): Promise<boolean>
}

export interface CryptoAdapter {
  randomBytes(length: number): Uint8Array
  digestSha256(data: Uint8Array, options?: AdapterOperationOptions): Promise<Uint8Array>
  encryptBackup(
    archive: BackupArchive,
    password: string,
    options?: AdapterOperationOptions
  ): Promise<BackupEnvelope>
  decryptBackup(
    envelope: BackupEnvelope,
    password: string,
    options?: AdapterOperationOptions
  ): Promise<BackupArchive>
}

export type BackupCreateResult = {
  envelope: BackupEnvelope
  filename: string
  preview: RestorePreview
}

export interface BackupAdapter {
  create(password: string, options?: AdapterOperationOptions): Promise<BackupCreateResult>
  inspect(
    envelope: BackupEnvelope,
    password: string,
    options?: AdapterOperationOptions
  ): Promise<RestorePreview>
  restore(
    envelope: BackupEnvelope,
    password: string,
    options?: AdapterOperationOptions
  ): Promise<void>
}

export type ExportRequest = {
  payload: ExportPayload
  format: ExportFormat
}

export interface LocalExportAdapter {
  export(request: ExportRequest, options?: AdapterOperationOptions): Promise<Blob>
}

export type MigrationStatus = "not-needed" | "pending" | "running" | "completed" | "failed"

export type MigrationPlan = {
  id: string
  fromVersion: number
  toVersion: number
  status: MigrationStatus
  requiresBackup: boolean
}

export interface MigrationAdapter {
  inspect(options?: AdapterOperationOptions): Promise<MigrationPlan[]>
  run(planId: string, options?: AdapterOperationOptions): Promise<void>
}

export type PwaUpdateCandidate = {
  currentAppVersion: string
  nextAppVersion: string
  currentSchemaVersion: number
  nextSchemaVersion: number
  risk: "normal" | "high"
}

export type PwaUpdateEvent =
  | { type: "unsupported" }
  | { type: "ready" }
  | { type: "checking" }
  | { type: "installing" }
  | { type: "update-ready"; candidate: PwaUpdateCandidate }
  | { type: "activated" }
  | { type: "error"; errorCode: PlatformErrorCode }

export interface PwaUpdateAdapter {
  register(options?: AdapterOperationOptions): Promise<void>
  check(options?: AdapterOperationOptions): Promise<void>
  subscribe(listener: (event: PwaUpdateEvent) => void): () => void
  activateWaiting(options?: AdapterOperationOptions): Promise<void>
}

export type PlatformErrorCode =
  | "OPERATION_ABORTED"
  | "AUTH_REQUIRED"
  | "STORAGE_UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "DATABASE_VERSION_MISSING"
  | "DATABASE_MIGRATION_REQUIRED"
  | "DATABASE_VERSION_TOO_NEW"
  | "SCHEMA_UPGRADE_FAILED"
  | "TRANSACTION_ABORTED"
  | "CRYPTO_UNAVAILABLE"
  | "BACKUP_INVALID"
  | "BACKUP_PASSWORD_OR_INTEGRITY_FAILED"
  | "BACKUP_VERSION_UNSUPPORTED"
  | "EXPORT_TEMPLATE_UNAVAILABLE"
  | "EXPORT_TEMPLATE_VERSION_MISMATCH"
  | "EXPORT_MEMORY_EXHAUSTED"
  | "EXPORT_GENERATION_FAILED"
  | "EXPORT_DOWNLOAD_FAILED"
  | "UPDATE_UNAVAILABLE"
  | "UPDATE_ACTIVATION_FAILED"

export type PlatformAdapterRegistry = {
  accountContext: AccountContextAdapter
  auth: LocalAuthAdapter
  data: DataAdapterFactory
  transaction: TransactionRunner
  file: LocalFileAdapter
  storage: StorageAdapter
  crypto: CryptoAdapter
  backup: BackupAdapter
  export: LocalExportAdapter
  migration: MigrationAdapter
  pwaUpdate: PwaUpdateAdapter
}
