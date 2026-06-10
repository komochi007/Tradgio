export { appConfig } from "./config"

export { QueryProvider, queryClient, createLocalStorageRepository } from "./query"
export type { Repository } from "./query"

export { AppError, mapError, getUserFacingMessage } from "./errors"
export type { AppErrorCode } from "./errors"

export { ToastProvider, useToast, ToastContainer } from "./notification"
export type { ToastType } from "./notification"

export { formatCurrency, formatNumber, formatDate, formatDateTime, generateId, formatFileSize } from "./utils"

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

export { persistenceConfig, STORAGE_KEYS, MIGRATION_POINTS, getAllStorageKeys } from "./persistence"
export type { PersistenceConfig, AuthAdapter, DataAdapter, FileAdapter, ExportAdapter, PersistenceRegistry } from "./persistence"
export { useFormDraft, getDraft, saveDraft, removeDraft } from "./drafts"
export type { DraftFormKey, DraftRecord } from "./drafts"
