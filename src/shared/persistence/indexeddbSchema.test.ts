import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it } from "vitest"
import { openTradgioDatabase } from "./indexedDbDatabase"
import {
  INDEXED_DB_SCHEMA,
  INDEXED_DB_SCHEMA_VERSION,
  INDEXED_DB_STORES,
  INDEXED_DB_TRANSACTIONS,
} from "./indexeddbSchema"
import type { IndexedDbStoreName } from "./indexeddbSchema"

function getStore(name: (typeof INDEXED_DB_STORES)[keyof typeof INDEXED_DB_STORES]) {
  const store = INDEXED_DB_SCHEMA.find((item) => item.name === name)
  expect(store).toBeDefined()
  return store!
}

describe("IndexedDB 持久化契约", () => {
  it("空数据库升级到当前 schema 并创建关键唯一索引", async () => {
    const database = await openTradgioDatabase(new IDBFactory())

    expect(database.version).toBe(INDEXED_DB_SCHEMA_VERSION)
    expect([...database.objectStoreNames].sort()).toEqual(Object.values(INDEXED_DB_STORES).sort())
    const transaction = database.transaction(
      [INDEXED_DB_STORES.purchaseOrders, INDEXED_DB_STORES.contracts],
      "readonly"
    )
    expect(
      transaction.objectStore(INDEXED_DB_STORES.purchaseOrders).index("byAccountDocumentNo").unique
    ).toBe(true)
    expect(
      transaction.objectStore(INDEXED_DB_STORES.contracts).index("byAccountContractNo").unique
    ).toBe(true)
    database.close()
  })

  it("object store 名称唯一且覆盖全部声明", () => {
    const names = INDEXED_DB_SCHEMA.map((store) => store.name)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(names)).toEqual(new Set(Object.values(INDEXED_DB_STORES)))
  })

  it.each([
    INDEXED_DB_STORES.purchaseOrders,
    INDEXED_DB_STORES.salesOrders,
    INDEXED_DB_STORES.quoteOrders,
  ])("%s 使用账号内单据编号复合唯一索引", (storeName) => {
    expect(getStore(storeName).indexes).toContainEqual({
      name: "byAccountDocumentNo",
      keyPath: ["accountId", "documentNo"],
      unique: true,
    })
  })

  it("合同编号与库存快照具有账号内复合唯一索引", () => {
    expect(getStore(INDEXED_DB_STORES.contracts).indexes).toContainEqual({
      name: "byAccountContractNo",
      keyPath: ["accountId", "contractNo"],
      unique: true,
    })
    expect(getStore(INDEXED_DB_STORES.inventorySnapshots).indexes).toContainEqual({
      name: "byAccountProduct",
      keyPath: ["accountId", "productId"],
      unique: true,
    })
  })

  it("单据与库存、合同与附件分别处于同一事务范围", () => {
    expect(INDEXED_DB_TRANSACTIONS.savePurchaseOrder).toEqual([
      INDEXED_DB_STORES.purchaseOrders,
      INDEXED_DB_STORES.inventoryLedger,
      INDEXED_DB_STORES.inventorySnapshots,
    ])
    expect(INDEXED_DB_TRANSACTIONS.saveSalesOrder).toEqual([
      INDEXED_DB_STORES.salesOrders,
      INDEXED_DB_STORES.inventoryLedger,
      INDEXED_DB_STORES.inventorySnapshots,
    ])
    expect(INDEXED_DB_TRANSACTIONS.saveContract).toEqual([
      INDEXED_DB_STORES.contracts,
      INDEXED_DB_STORES.attachmentMetadata,
      INDEXED_DB_STORES.attachmentBlobs,
    ])
  })

  it("所有业务与附件 store 都强制账号作用域", () => {
    const platformStores = new Set<IndexedDbStoreName>([
      INDEXED_DB_STORES.accounts,
      INDEXED_DB_STORES.accountCredentials,
      INDEXED_DB_STORES.migrationRecords,
      INDEXED_DB_STORES.appSettings,
    ])
    const unscoped = INDEXED_DB_SCHEMA.filter(
      (store) => !store.accountScoped && !platformStores.has(store.name)
    )
    expect(unscoped).toEqual([])
  })
})
