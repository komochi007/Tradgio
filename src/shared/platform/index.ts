export {
  DEFAULT_RUNTIME_CONFIG,
  createRuntimeConfig,
  checkRuntimeCompatibility,
} from "./runtimeConfig"
export {
  INITIAL_PWA_UPDATE_STATE,
  reducePwaUpdateState,
  evaluateUpdateActivation,
  shouldReloadAutomatically,
} from "./pwaUpdateContract"
export { createPlatformAdapterRegistry, replacePlatformAdapter } from "./registry"
export { createPwaUpdateTestDouble, createPlatformAdapterTestRegistry } from "./testDoubles"
export { PlatformAdapterError, mapPlatformError } from "./errors"
export type {
  AdapterOperationOptions,
  TransactionalOperationOptions,
  AccountContextAdapter,
  LocalAuthAdapter,
  LocalDataAdapter,
  DataAdapterFactory,
  LocalFileAdapter,
  StorageEstimate,
  StorageAdapter,
  CryptoAdapter,
  BackupCreateResult,
  BackupAdapter,
  ExportRequest,
  LocalExportAdapter,
  MigrationStatus,
  MigrationPlan,
  MigrationAdapter,
  PwaUpdateCandidate,
  PwaUpdateEvent,
  PwaUpdateAdapter,
  PlatformErrorCode,
  PlatformAdapterRegistry,
} from "./types"
export type {
  RuntimeEnvironment,
  RuntimeConfigInput,
  RuntimeConfig,
  RuntimeCompatibility,
} from "./runtimeConfig"
export type {
  PwaUpdatePhase,
  PwaUpdateState,
  PwaUpdateAction,
  UpdateActivationContext,
  UpdateActivationDecision,
} from "./pwaUpdateContract"
export type { AdapterCall } from "./testDoubles"
export type { PlatformOperation } from "./errors"
