import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BACKUP_STORES,
  INDEXED_DB_STORES,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../../shared/persistence"
import { PlatformAdapterError } from "../../shared/platform"
import { resetTradgioDatabase } from "../../test/indexedDb"
import { BackupService } from "./application/backupService"

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const account = {
  id: "account-a",
  username: "测试账号",
  normalizedUsername: "测试账号",
  createdAt: "2026-06-15T00:00:00.000Z",
}

async function seedDatabase() {
  const database = await openTradgioDatabase()
  const transaction = database.transaction([...BACKUP_STORES], "readwrite")
  const completion = transactionToPromise(transaction)
  transaction.objectStore(INDEXED_DB_STORES.accounts).add(account)
  transaction.objectStore(INDEXED_DB_STORES.accountCredentials).add({
    accountId: account.id,
    passwordVerifier: { version: 1 },
  })
  transaction.objectStore(INDEXED_DB_STORES.products).add({
    id: "product-a",
    accountId: account.id,
    name: "测试货品",
    status: "active",
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.purchaseOrders).add({
    id: "purchase-a",
    accountId: account.id,
    documentNo: "JH20260601",
    totalAmount: 12.34,
    happenedAt: "2026-06-15",
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.salesOrders).add({
    id: "sales-a",
    accountId: account.id,
    documentNo: "CH20260601",
    totalAmount: 2.34,
    happenedAt: "2026-06-15",
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.quoteOrders).add({
    id: "quote-a",
    accountId: account.id,
    documentNo: "BJ20260601",
    totalAmount: 20,
    happenedAt: "2026-06-15",
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.inventorySnapshots).add({
    id: "account-a:product-a",
    accountId: account.id,
    productId: "product-a",
    quantity: 42,
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.attachmentMetadata).add({
    id: "attachment-a",
    accountId: account.id,
    contractId: "contract-a",
    fileName: "sample.pdf",
    mimeType: "application/pdf",
    fileSize: 4,
    uploadedAt: "2026-06-15T00:00:00.000Z",
  })
  transaction.objectStore(INDEXED_DB_STORES.attachmentBlobs).add({
    id: "attachment-a",
    accountId: account.id,
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "application/pdf" }),
  })
  await completion
  database.close()
}

async function getProductName() {
  const database = await openTradgioDatabase()
  try {
    const product = (await requestToPromise(
      database
        .transaction(INDEXED_DB_STORES.products, "readonly")
        .objectStore(INDEXED_DB_STORES.products)
        .get("product-a")
    )) as { name: string } | undefined
    return product?.name
  } finally {
    database.close()
  }
}

async function changeProductName(name: string) {
  const database = await openTradgioDatabase()
  const transaction = database.transaction(INDEXED_DB_STORES.products, "readwrite")
  const store = transaction.objectStore(INDEXED_DB_STORES.products)
  const product = (await requestToPromise(store.get("product-a"))) as Record<string, unknown>
  store.put({ ...product, name })
  await transactionToPromise(transaction)
  database.close()
}

describe("BackupService", () => {
  it("非浏览器环境加载默认服务时不立即访问 localStorage", () => {
    vi.stubGlobal("localStorage", undefined)
    expect(() => new BackupService()).not.toThrow()
    vi.unstubAllGlobals()
  })

  const storage = new MemoryStorage()
  const service = new BackupService({
    crypto,
    storage,
    estimateStorage: async () => ({ usage: 1024, quota: 1024 * 1024 * 1024 }),
    now: () => new Date("2026-06-15T08:00:00.000Z"),
  })

  beforeEach(async () => {
    await resetTradgioDatabase()
    storage.clear()
    await seedDatabase()
  })

  afterEach(async () => {
    await resetTradgioDatabase()
  })

  it("生成可审计加密备份并排除活动 session", async () => {
    storage.setItem("tradgio_session", JSON.stringify({ token: "secret" }))
    const backup = await service.createBackup("correct horse battery")

    expect(backup.filename).toBe("tradgio-backup-20260615-v0.1.0.tradgio-backup")
    expect(backup.preview.accountCount).toBe(1)
    expect(backup.preview.attachments).toEqual({ count: 1, totalBytes: 4 })
    expect(backup.preview.totals).toEqual({
      purchaseAmountMinor: 1234,
      salesAmountMinor: 234,
      quoteAmountMinor: 2000,
      stockQuantity: 42,
    })
    expect(backup.archive.stores).not.toHaveProperty("session")
    expect(backup.archive.manifest.stores).toHaveLength(15)
  })

  it("错误密码和密文篡改均在写入前失败", async () => {
    const backup = await service.createBackup("correct horse battery")
    await changeProductName("现有数据")

    await expect(service.inspectBackup(backup.bytes, "wrong password value")).rejects.toMatchObject(
      {
        code: "BACKUP_PASSWORD_OR_INTEGRITY_FAILED",
      } satisfies Partial<PlatformAdapterError>
    )

    const tampered = backup.bytes.slice()
    tampered[tampered.length - 1] ^= 1
    await expect(service.inspectBackup(tampered, "correct horse battery")).rejects.toMatchObject({
      code: "BACKUP_PASSWORD_OR_INTEGRITY_FAILED",
    } satisfies Partial<PlatformAdapterError>)
    expect(await getProductName()).toBe("现有数据")
  })

  it("恢复前快照下载失败时不修改数据，成功后整机恢复并清除 session", async () => {
    const backup = await service.createBackup("correct horse battery")
    await changeProductName("待替换数据")
    storage.setItem("tradgio_session", JSON.stringify({ token: "secret" }))
    const inspection = await service.inspectBackup(backup.bytes, "correct horse battery")

    await expect(
      service.restoreBackup({
        inspection,
        password: "correct horse battery",
        sourceFilename: backup.filename,
        downloadSnapshot: async () => {
          throw new Error("download failed")
        },
      })
    ).rejects.toThrow("download failed")
    expect(await getProductName()).toBe("待替换数据")

    let snapshotFilename = ""
    const report = await service.restoreBackup({
      inspection,
      password: "correct horse battery",
      sourceFilename: backup.filename,
      downloadSnapshot: async (snapshot) => {
        snapshotFilename = snapshot.filename
      },
    })

    expect(snapshotFilename).toContain(".pre-restore.tradgio-backup")
    expect(await getProductName()).toBe("测试货品")
    expect(storage.getItem("tradgio_session")).toBeNull()
    expect(report.status).toBe("completed")
    expect(report.attachments).toEqual({ count: 1, totalBytes: 4 })
  })

  it("容量未知时在恢复写入前阻断", async () => {
    const blockedService = new BackupService({
      crypto,
      storage,
      estimateStorage: async () => ({ usage: 0, quota: 0 }),
    })
    const backup = await service.createBackup("correct horse battery")

    await expect(
      blockedService.inspectBackup(backup.bytes, "correct horse battery")
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" } satisfies Partial<PlatformAdapterError>)
  })
})
