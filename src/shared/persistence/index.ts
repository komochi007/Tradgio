export { persistenceConfig, STORAGE_KEYS, MIGRATION_POINTS, getAllStorageKeys } from "./registry"
export {
  INDEXED_DB_NAME,
  INDEXED_DB_SCHEMA_VERSION,
  INDEXED_DB_STORES,
  INDEXED_DB_SCHEMA,
  INDEXED_DB_TRANSACTIONS,
} from "./indexeddbSchema"
export { openTradgioDatabase, requestToPromise, transactionToPromise } from "./indexedDbDatabase"
export { BUSINESS_DATA_MIGRATION_ID, migrateBusinessDataToIndexedDb } from "./businessDataMigration"
export type { BusinessDataMigrationReport } from "./businessDataMigration"
export {
  ATTACHMENT_MAX_FILE_SIZE,
  ATTACHMENT_STORAGE_WARNING_RATIO,
  ATTACHMENT_STORAGE_BLOCK_RATIO,
  estimateAttachmentStorage,
} from "./attachmentStoragePolicy"
export type { AttachmentStorageStatus } from "./attachmentStoragePolicy"
export {
  BACKUP_FILE_EXTENSION,
  BACKUP_MAGIC,
  BACKUP_FORMAT_VERSION,
  BACKUP_CRYPTO,
  BACKUP_COMPRESSION,
  BACKUP_SERIALIZATION,
  BACKUP_DIGEST,
  BACKUP_PASSWORD_MIN_LENGTH,
  BACKUP_STORES,
  checkBackupCompatibility,
  checkBackupHeaderCompatibility,
  evaluateRestoreCapacity,
  canTransitionRestore,
  restoreMayWriteDatabase,
  buildRestorePreview,
} from "./backupContract"
export type {
  PersistenceConfig,
  AuthAdapter,
  DataAdapter,
  AttachmentMetadata,
  FileSaveInput,
  FileAdapter,
  ExportAdapter,
  PersistenceRegistry,
} from "./types"
export type {
  IndexedDbStoreName,
  IndexedDbKeyPath,
  IndexedDbIndexDefinition,
  IndexedDbStoreDefinition,
  PersistenceErrorCode,
  AccountContextProvider,
  PersistenceTransaction,
  TransactionRunner,
} from "./indexeddbSchema"
export type {
  BackupEnvelopeHeader,
  BackupEnvelopeHeaderCandidate,
  BackupEnvelope,
  BackupStoreSummary,
  BackupAttachmentSummary,
  BackupBusinessTotals,
  BackupManifest,
  SerializedAttachmentBlob,
  BackupStoreData,
  BackupArchive,
  BackupCompatibility,
  RestoreCapacityInput,
  RestoreCapacityResult,
  RestorePhase,
  RestorePreview,
} from "./backupContract"
