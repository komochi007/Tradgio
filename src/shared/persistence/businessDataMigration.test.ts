import { beforeEach, describe, expect, it } from "vitest"
import { IDBFactory } from "fake-indexeddb"
import { getAccountScopeMigrationKey } from "../account"
import { STORAGE_KEYS } from "./registry"
import { INDEXED_DB_NAME, INDEXED_DB_STORES } from "./indexeddbSchema"
import { openTradgioDatabase, requestToPromise, transactionToPromise } from "./indexedDbDatabase"
import { BUSINESS_DATA_MIGRATION_ID, migrateBusinessDataToIndexedDb } from "./businessDataMigration"

class MemoryStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

const storage = new MemoryStorage()

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
})

async function readStore<T>(factory: IDBFactory, storeName: string): Promise<T[]> {
  const database = await openTradgioDatabase(factory)
  const transaction = database.transaction(storeName, "readonly")
  const records = (await requestToPromise(transaction.objectStore(storeName).getAll())) as T[]
  await transactionToPromise(transaction)
  database.close()
  return records
}

beforeEach(() => {
  storage.clear()
})

describe("localStorage 业务数据迁移", () => {
  it("一次迁移双账号业务数据与草稿并保留旧数据", async () => {
    const factory = new IDBFactory()
    storage.setItem(
      STORAGE_KEYS.data.products,
      JSON.stringify([
        { id: "product-a", accountId: "account-a", name: "A货品", updatedAt: "2026-06-12" },
        { id: "product-b", accountId: "account-b", name: "B货品", updatedAt: "2026-06-12" },
      ])
    )
    storage.setItem(
      STORAGE_KEYS.drafts,
      JSON.stringify({
        "account-a:product-new": {
          accountId: "account-a",
          formKey: "product-new",
          data: { name: "草稿货品" },
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
      })
    )

    const report = await migrateBusinessDataToIndexedDb("account-a", { storage, factory })

    expect(report.accountIds).toEqual(["account-a", "account-b"])
    expect(report.recordCounts.products).toBe(2)
    expect(report.recordCounts.drafts).toBe(1)
    expect(await readStore(factory, INDEXED_DB_STORES.products)).toHaveLength(2)
    expect(await readStore(factory, INDEXED_DB_STORES.drafts)).toEqual([
      expect.objectContaining({ id: "account-a:product-new", accountId: "account-a" }),
    ])
    expect(storage.getItem(STORAGE_KEYS.data.products)).not.toBeNull()
    expect(storage.getItem(STORAGE_KEYS.drafts)).not.toBeNull()
  })

  it("重复执行返回同一迁移报告且不重复写入", async () => {
    const factory = new IDBFactory()
    storage.setItem(
      STORAGE_KEYS.data.products,
      JSON.stringify([{ id: "product-a", accountId: "account-a", updatedAt: "2026-06-12" }])
    )

    const first = await migrateBusinessDataToIndexedDb("account-a", { storage, factory })
    const second = await migrateBusinessDataToIndexedDb("account-a", { storage, factory })

    expect(second).toEqual(first)
    expect(await readStore(factory, INDEXED_DB_STORES.products)).toHaveLength(1)
    expect(await readStore(factory, INDEXED_DB_STORES.migrationRecords)).toEqual([
      expect.objectContaining({ id: BUSINESS_DATA_MIGRATION_ID }),
    ])
  })

  it("唯一索引冲突时整体回滚且保留迁移源", async () => {
    const factory = new IDBFactory()
    const legacyOrders = [
      {
        id: "purchase-1",
        accountId: "account-a",
        documentNo: "JH20260601",
        happenedAt: "2026-06-12",
        updatedAt: "2026-06-12",
      },
      {
        id: "purchase-2",
        accountId: "account-a",
        documentNo: "JH20260601",
        happenedAt: "2026-06-12",
        updatedAt: "2026-06-12",
      },
    ]
    storage.setItem(STORAGE_KEYS.data.purchases, JSON.stringify(legacyOrders))

    await expect(
      migrateBusinessDataToIndexedDb("account-a", { storage, factory })
    ).rejects.toBeDefined()

    expect(await readStore(factory, INDEXED_DB_STORES.purchaseOrders)).toEqual([])
    expect(await readStore(factory, INDEXED_DB_STORES.migrationRecords)).toEqual([])
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.data.purchases) ?? "[]")).toEqual(legacyOrders)
  })

  it("损坏的旧集合不会留下半迁移状态", async () => {
    const factory = new IDBFactory()
    storage.setItem(STORAGE_KEYS.data.products, "{invalid-json")

    await expect(
      migrateBusinessDataToIndexedDb("account-a", { storage, factory })
    ).rejects.toBeDefined()

    expect(await readStore(factory, INDEXED_DB_STORES.products)).toEqual([])
    expect(await readStore(factory, INDEXED_DB_STORES.migrationRecords)).toEqual([])
    expect(storage.getItem(STORAGE_KEYS.data.products)).toBe("{invalid-json")
    expect(storage.getItem(getAccountScopeMigrationKey())).not.toBeNull()
  })

  it("数据库版本过新时拒绝迁移且不修改旧数据", async () => {
    const factory = new IDBFactory()
    const request = factory.open(INDEXED_DB_NAME, 2)
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    storage.setItem(
      STORAGE_KEYS.data.products,
      JSON.stringify([{ id: "product-a", accountId: "account-a" }])
    )

    await expect(
      migrateBusinessDataToIndexedDb("account-a", { storage, factory })
    ).rejects.toMatchObject({ code: "DATABASE_VERSION_TOO_NEW" })
    expect(storage.getItem(STORAGE_KEYS.data.products)).not.toBeNull()
  })
})
