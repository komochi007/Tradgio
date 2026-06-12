export const INDEXED_DB_NAME = "tradgio"
export const INDEXED_DB_SCHEMA_VERSION = 1

export const INDEXED_DB_STORES = {
  accounts: "accounts",
  accountCredentials: "accountCredentials",
  products: "products",
  counterparties: "counterparties",
  purchaseOrders: "purchaseOrders",
  salesOrders: "salesOrders",
  quoteOrders: "quoteOrders",
  inventoryLedger: "inventoryLedger",
  inventorySnapshots: "inventorySnapshots",
  contracts: "contracts",
  attachmentMetadata: "attachmentMetadata",
  attachmentBlobs: "attachmentBlobs",
  migrationRecords: "migrationRecords",
  appSettings: "appSettings",
  drafts: "drafts",
} as const

export type IndexedDbStoreName = (typeof INDEXED_DB_STORES)[keyof typeof INDEXED_DB_STORES]
export type IndexedDbKeyPath = string | readonly string[]

export type IndexedDbIndexDefinition = {
  name: string
  keyPath: IndexedDbKeyPath
  unique?: boolean
  multiEntry?: boolean
}

export type IndexedDbStoreDefinition = {
  name: IndexedDbStoreName
  keyPath: IndexedDbKeyPath
  autoIncrement?: boolean
  accountScoped: boolean
  indexes: readonly IndexedDbIndexDefinition[]
}

const accountIndex: IndexedDbIndexDefinition = { name: "byAccount", keyPath: "accountId" }
const accountUpdatedIndex: IndexedDbIndexDefinition = {
  name: "byAccountUpdatedAt",
  keyPath: ["accountId", "updatedAt"],
}

export const INDEXED_DB_SCHEMA: readonly IndexedDbStoreDefinition[] = [
  {
    name: INDEXED_DB_STORES.accounts,
    keyPath: "id",
    accountScoped: false,
    indexes: [{ name: "byNormalizedUsername", keyPath: "normalizedUsername", unique: true }],
  },
  {
    name: INDEXED_DB_STORES.accountCredentials,
    keyPath: "accountId",
    accountScoped: false,
    indexes: [],
  },
  {
    name: INDEXED_DB_STORES.products,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      accountUpdatedIndex,
      { name: "byAccountStatus", keyPath: ["accountId", "status"] },
    ],
  },
  {
    name: INDEXED_DB_STORES.counterparties,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      accountUpdatedIndex,
      { name: "byAccountType", keyPath: ["accountId", "type"] },
    ],
  },
  ...(["purchaseOrders", "salesOrders", "quoteOrders"] as const).map((store) => ({
    name: INDEXED_DB_STORES[store],
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      accountUpdatedIndex,
      { name: "byAccountDocumentNo", keyPath: ["accountId", "documentNo"], unique: true },
      { name: "byAccountHappenedAt", keyPath: ["accountId", "happenedAt"] },
    ],
  })),
  {
    name: INDEXED_DB_STORES.inventoryLedger,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      { name: "byAccountProduct", keyPath: ["accountId", "productId"] },
      { name: "byAccountDocument", keyPath: ["accountId", "documentType", "documentId"] },
      { name: "byAccountCreatedAt", keyPath: ["accountId", "createdAt"] },
    ],
  },
  {
    name: INDEXED_DB_STORES.inventorySnapshots,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      { name: "byAccountProduct", keyPath: ["accountId", "productId"], unique: true },
    ],
  },
  {
    name: INDEXED_DB_STORES.contracts,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      accountUpdatedIndex,
      { name: "byAccountContractNo", keyPath: ["accountId", "contractNo"], unique: true },
      { name: "byAccountCustomer", keyPath: ["accountId", "customerId"] },
    ],
  },
  {
    name: INDEXED_DB_STORES.attachmentMetadata,
    keyPath: "id",
    accountScoped: true,
    indexes: [accountIndex, { name: "byAccountContract", keyPath: ["accountId", "contractId"] }],
  },
  {
    name: INDEXED_DB_STORES.attachmentBlobs,
    keyPath: "id",
    accountScoped: true,
    indexes: [accountIndex],
  },
  {
    name: INDEXED_DB_STORES.migrationRecords,
    keyPath: "id",
    accountScoped: false,
    indexes: [{ name: "byCompletedAt", keyPath: "completedAt" }],
  },
  {
    name: INDEXED_DB_STORES.appSettings,
    keyPath: "key",
    accountScoped: false,
    indexes: [],
  },
  {
    name: INDEXED_DB_STORES.drafts,
    keyPath: "id",
    accountScoped: true,
    indexes: [
      accountIndex,
      { name: "byAccountForm", keyPath: ["accountId", "formKey"], unique: true },
    ],
  },
]

export const INDEXED_DB_TRANSACTIONS = {
  savePurchaseOrder: ["purchaseOrders", "inventoryLedger", "inventorySnapshots"],
  saveSalesOrder: ["salesOrders", "inventoryLedger", "inventorySnapshots"],
  saveQuoteOrder: ["quoteOrders"],
  saveContract: ["contracts", "attachmentMetadata", "attachmentBlobs"],
  deleteContract: ["contracts", "attachmentMetadata", "attachmentBlobs"],
  migrateBusinessData: [
    "products",
    "counterparties",
    "purchaseOrders",
    "salesOrders",
    "quoteOrders",
    "inventoryLedger",
    "inventorySnapshots",
    "contracts",
    "attachmentMetadata",
    "attachmentBlobs",
    "drafts",
    "migrationRecords",
  ],
} as const satisfies Record<string, readonly IndexedDbStoreName[]>

export type PersistenceErrorCode =
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "QUOTA_EXCEEDED"
  | "SCHEMA_UPGRADE_FAILED"
  | "SCHEMA_TOO_NEW"
  | "TRANSACTION_ABORTED"
  | "STORAGE_UNAVAILABLE"

export interface AccountContextProvider {
  requireAccountId(): string
}

export interface PersistenceTransaction {
  readonly mode: "readonly" | "readwrite"
  readonly stores: readonly IndexedDbStoreName[]
}

export interface TransactionRunner {
  run<T>(
    stores: readonly IndexedDbStoreName[],
    mode: PersistenceTransaction["mode"],
    operation: (transaction: PersistenceTransaction) => Promise<T>
  ): Promise<T>
}
