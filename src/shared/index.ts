export { appConfig } from "./config"

export { QueryProvider, queryClient, createLocalStorageRepository } from "./query"
export type { LocalTransactionalRepository, Repository } from "./query"

export { generateNextDocumentNumber } from "./document-number"
export type { DocumentNumberType } from "./document-number"

export {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getAccountScopeMigrationKey,
  getCurrentAccountId,
  migrateLegacyBusinessData,
  requireCurrentAccountId,
} from "./account"

export { runLocalAtomicSave } from "./transaction"

export { AppError, mapError, getUserFacingMessage } from "./errors"
export type { AppErrorCode } from "./errors"

export { ToastProvider, useToast, ToastContainer } from "./notification"
export type { ToastType } from "./notification"

export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  generateId,
  formatFileSize,
} from "./utils"

export { paginationSchema, searchQuerySchema, validate } from "./validation"
export type { z } from "./validation"
export {
  AppIcon,
  OverviewIcon,
  ProductIcon,
  CounterpartyIcon,
  PurchaseIcon,
  SalesIcon,
  QuoteIcon,
  ContractIcon,
  SearchIcon,
  AccountIcon,
  LogoutIcon,
  CalendarIcon,
  WeatherIcon,
} from "./icons"

export {
  Button,
  Input,
  Select,
  Tag,
  EmptyState,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SectionCard,
  PageError,
  ErrorBoundary,
  FormErrorSummary,
  ProductSearchSelect,
  ExportDropdown,
  DraftRestoreBanner,
  DraftSaveStatus,
} from "./components"
export type { SelectOption, ProductOption } from "./components"

export {
  persistenceConfig,
  STORAGE_KEYS,
  MIGRATION_POINTS,
  getAllStorageKeys,
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
} from "./persistence"
export type {
  PersistenceConfig,
  AuthAdapter,
  DataAdapter,
  AttachmentMetadata,
  FileSaveInput,
  FileAdapter,
  ExportAdapter,
  PersistenceRegistry,
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
} from "./persistence"
export { useFormDraft, getDraft, saveDraft, removeDraft } from "./drafts"
export type { DraftFormKey, DraftRecord } from "./drafts"
