import { migrateLegacyBusinessData } from "../account"
import { STORAGE_KEYS } from "./registry"
import { INDEXED_DB_STORES, INDEXED_DB_TRANSACTIONS } from "./indexeddbSchema"
import { openTradgioDatabase, requestToPromise, transactionToPromise } from "./indexedDbDatabase"

export const BUSINESS_DATA_MIGRATION_ID = "local-storage-business-data-v1"

export type BusinessDataMigrationReport = {
  id: string
  version: 1
  source: "localStorage"
  completedAt: string
  accountIds: string[]
  recordCounts: Record<string, number>
}

const COLLECTIONS = [
  [STORAGE_KEYS.data.products, INDEXED_DB_STORES.products],
  [STORAGE_KEYS.data.counterparties, INDEXED_DB_STORES.counterparties],
  [STORAGE_KEYS.data.purchases, INDEXED_DB_STORES.purchaseOrders],
  [STORAGE_KEYS.data.sales, INDEXED_DB_STORES.salesOrders],
  [STORAGE_KEYS.data.quotes, INDEXED_DB_STORES.quoteOrders],
  [STORAGE_KEYS.data.inventoryLedger, INDEXED_DB_STORES.inventoryLedger],
  [STORAGE_KEYS.data.inventorySnapshot, INDEXED_DB_STORES.inventorySnapshots],
  [STORAGE_KEYS.data.contracts, INDEXED_DB_STORES.contracts],
] as const

function readCollection(storage: Storage, key: string): Record<string, unknown>[] {
  const raw = storage.getItem(key)
  if (!raw) return []

  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`旧数据格式无效: ${key}`)
  }
  return parsed.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`旧数据包含无效记录: ${key}`)
    }
    return record as Record<string, unknown>
  })
}

function readDrafts(storage: Storage): Record<string, unknown>[] {
  const raw = storage.getItem(STORAGE_KEYS.drafts)
  if (!raw) return []

  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`旧数据格式无效: ${STORAGE_KEYS.drafts}`)
  }

  return Object.entries(parsed).map(([id, record]) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`旧数据包含无效记录: ${STORAGE_KEYS.drafts}`)
    }
    return { id, ...(record as Record<string, unknown>) }
  })
}

let activeMigration: Promise<BusinessDataMigrationReport> | null = null

async function executeBusinessDataMigration(
  options: { storage?: Storage; factory?: IDBFactory } = {}
): Promise<BusinessDataMigrationReport> {
  const storage = options.storage ?? localStorage

  const database = await openTradgioDatabase(options.factory)
  const checkTransaction = database.transaction(INDEXED_DB_STORES.migrationRecords, "readonly")
  const existing = await requestToPromise(
    checkTransaction.objectStore(INDEXED_DB_STORES.migrationRecords).get(BUSINESS_DATA_MIGRATION_ID)
  )
  await transactionToPromise(checkTransaction)
  if (existing) {
    database.close()
    return existing as BusinessDataMigrationReport
  }

  const recordsByStore = new Map<string, Record<string, unknown>[]>()
  for (const [storageKey, storeName] of COLLECTIONS) {
    recordsByStore.set(storeName, readCollection(storage, storageKey))
  }
  recordsByStore.set(INDEXED_DB_STORES.drafts, readDrafts(storage))

  const accountIds = new Set<string>()
  const recordCounts: Record<string, number> = {}
  for (const [storeName, records] of recordsByStore) {
    recordCounts[storeName] = records.length
    for (const record of records) {
      if (typeof record.accountId !== "string" || !record.accountId) {
        database.close()
        throw new Error(`旧数据缺少账号归属: ${storeName}`)
      }
      accountIds.add(record.accountId)
    }
  }

  const report: BusinessDataMigrationReport = {
    id: BUSINESS_DATA_MIGRATION_ID,
    version: 1,
    source: "localStorage",
    completedAt: new Date().toISOString(),
    accountIds: [...accountIds].sort(),
    recordCounts,
  }

  const transaction = database.transaction(INDEXED_DB_TRANSACTIONS.migrateBusinessData, "readwrite")
  const completion = transactionToPromise(transaction)
  try {
    for (const [storeName, records] of recordsByStore) {
      const store = transaction.objectStore(storeName)
      for (const record of records) {
        store.add(record)
      }
    }
    transaction.objectStore(INDEXED_DB_STORES.migrationRecords).add(report)
    await completion
    return report
  } catch (error) {
    try {
      transaction.abort()
    } catch {}
    await completion.catch(() => undefined)
    throw error
  } finally {
    database.close()
  }
}

export function migrateBusinessDataToIndexedDb(
  accountId: string,
  options: { storage?: Storage; factory?: IDBFactory } = {}
): Promise<BusinessDataMigrationReport> {
  migrateLegacyBusinessData(accountId)
  if (activeMigration) return activeMigration

  activeMigration = executeBusinessDataMigration(options).finally(() => {
    activeMigration = null
  })
  return activeMigration
}
