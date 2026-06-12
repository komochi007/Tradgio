import { beforeEach, describe, expect, it } from "vitest"
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getAccountScopeMigrationKey,
  migrateLegacyBusinessData,
} from "../../shared"
import { productRepository } from "../master-data/products"
import { counterpartyRepository } from "../master-data/counterparties"
import {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
} from "../document-core/purchases"
import type { PurchaseFormData } from "../document-core/purchases"
import { createSalesOrder, listSalesOrders } from "../document-core/sales"
import type { SalesFormData } from "../document-core/sales"
import { createQuoteOrder, listQuoteOrders } from "../document-core/quotes"
import type { QuoteFormData } from "../document-core/quotes"
import { createContractRecord, listContractRecords } from "../contract-center"
import { getCurrentStock } from "../inventory-engine"
import { searchDocuments } from "../search/application/searchService"
import { buildPurchaseExportPayload } from "../export-service"
import { resetTradgioDatabase } from "../../test/indexedDb"

const SESSION_KEY = "tradgio_session"
const PRODUCTS_KEY = "tradgio_products"

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

function switchAccount(accountId: string, username = accountId): void {
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      account: {
        id: accountId,
        username,
        createdAt: "2026-06-10T00:00:00.000Z",
      },
      token: `${accountId}-token`,
      issuedAt: "2026-06-10T00:00:00.000Z",
    })
  )
}

async function createMasterData(label: string) {
  const product = await productRepository.create({
    id: `${label}-product`,
    productCode: `${label}-P001`,
    name: `${label}隔离货品`,
    spec: "A1",
    unit: "件",
    productType: "测试",
    material: "测试材质",
    defaultPurchasePrice: 10,
    defaultSalesPrice: 20,
    notes: "",
    status: "active",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  })
  const supplier = await counterpartyRepository.create({
    id: `${label}-supplier`,
    name: `${label}隔离供应商`,
    type: "supplier",
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
    status: "active",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  })
  const customer = await counterpartyRepository.create({
    id: `${label}-customer`,
    name: `${label}隔离客户`,
    type: "customer",
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
    status: "active",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  })
  return { product, supplier, customer }
}

function purchaseForm(
  label: string,
  productId: string,
  supplierId: string,
  quantity: string
): PurchaseFormData {
  return {
    supplierId,
    supplierName: `${label}隔离供应商`,
    happenedAt: "2026-06-10",
    remark: "",
    lines: [
      {
        key: `${label}-purchase-line`,
        productId,
        productName: `${label}隔离货品`,
        spec: "A1",
        unit: "件",
        quantity,
        unitPrice: "10",
      },
    ],
  }
}

function salesForm(
  label: string,
  productId: string,
  customerId: string,
  quantity: string
): SalesFormData {
  return {
    customerId,
    customerName: `${label}隔离客户`,
    happenedAt: "2026-06-10",
    remark: "",
    lines: [
      {
        key: `${label}-sales-line`,
        productId,
        productCode: `${label}-P001`,
        productName: `${label}隔离货品`,
        spec: "A1",
        color: "蓝色",
        unit: "件",
        quantity,
        unitPrice: "20",
        lineRemark: "",
      },
    ],
  }
}

function quoteForm(label: string, productId: string, customerId: string): QuoteFormData {
  return {
    customerId,
    customerName: `${label}隔离客户`,
    happenedAt: "2026-06-10",
    remark: "",
    lines: [
      {
        key: `${label}-quote-line`,
        productId,
        productName: `${label}隔离货品`,
        spec: "A1",
        composition: "测试材质",
        color: "蓝色",
        bulkMoq: "100",
        unit: "件",
        quantity: "1",
        taxExcludedUnitPrice: "",
        unitPrice: "20",
        dyeingFee: "",
        leadTime: "7天",
      },
    ],
  }
}

beforeEach(async () => {
  await resetTradgioDatabase()
  storage.clear()
})

describe("账号业务数据隔离", () => {
  it("两个账号的 CRUD、搜索、库存和编号互相隔离", async () => {
    switchAccount("account-a")
    const a = await createMasterData("A")
    const purchaseA = await createPurchaseOrder(
      purchaseForm("A", a.product.id, a.supplier.id, "10")
    )
    await createSalesOrder(salesForm("A", a.product.id, a.customer.id, "2"))
    await createQuoteOrder(quoteForm("A", a.product.id, a.customer.id))
    await createContractRecord(
      {
        contractNo: "A-CONTRACT",
        title: "A隔离合同",
        customerId: a.customer.id,
        customerName: a.customer.name,
        signDate: "2026-06-10",
        remark: "",
      },
      []
    )

    expect(await getCurrentStock(a.product.id)).toBe(8)
    expect(await searchDocuments("A隔离")).toHaveLength(4)

    switchAccount("account-b")
    expect(await productRepository.getById(a.product.id)).toBeUndefined()
    expect(await getPurchaseOrder(purchaseA.id)).toBeUndefined()
    expect(() => buildPurchaseExportPayload(purchaseA)).toThrow("不能导出其他账号")
    await expect(productRepository.update(a.product.id, { name: "越权修改" })).rejects.toThrow(
      "记录不存在"
    )
    await productRepository.remove(a.product.id)
    expect(await searchDocuments("A隔离")).toEqual([])
    expect(await getCurrentStock(a.product.id)).toBe(0)

    await expect(
      createPurchaseOrder(purchaseForm("A", a.product.id, a.supplier.id, "1"))
    ).rejects.toThrow("不属于当前账号")

    const b = await createMasterData("B")
    const purchaseB = await createPurchaseOrder(purchaseForm("B", b.product.id, b.supplier.id, "4"))
    await createSalesOrder(salesForm("B", b.product.id, b.customer.id, "1"))
    await createQuoteOrder(quoteForm("B", b.product.id, b.customer.id))
    await createContractRecord(
      {
        contractNo: "B-CONTRACT",
        title: "B隔离合同",
        customerId: b.customer.id,
        customerName: b.customer.name,
        signDate: "2026-06-10",
        remark: "",
      },
      []
    )

    expect(purchaseB.documentNo).toBe(purchaseA.documentNo)
    expect(await getCurrentStock(b.product.id)).toBe(3)
    expect(await listPurchaseOrders()).toHaveLength(1)
    expect(await listSalesOrders()).toHaveLength(1)
    expect(await listQuoteOrders()).toHaveLength(1)
    expect(await listContractRecords()).toHaveLength(1)
    expect(await searchDocuments("B隔离")).toHaveLength(4)

    switchAccount("account-a")
    expect(await productRepository.getById(a.product.id)).toBeDefined()
    expect(await getPurchaseOrder(purchaseA.id)).toBeDefined()
    expect(await getCurrentStock(a.product.id)).toBe(8)
    expect(await searchDocuments("B隔离")).toEqual([])

    const updated = await updatePurchaseOrder(
      purchaseA.id,
      purchaseForm("A", a.product.id, a.supplier.id, "9")
    )
    expect(updated.accountId).toBe("account-a")
    expect(await getCurrentStock(a.product.id)).toBe(7)
  })

  it("无当前账号时禁止业务读写", async () => {
    await expect(productRepository.getAll()).rejects.toThrow("请重新登录")
    await expect(
      productRepository.create({
        id: "guest-product",
        productCode: "",
        name: "游客货品",
        spec: "",
        unit: "件",
        productType: "",
        material: "",
        defaultPurchasePrice: null,
        defaultSalesPrice: null,
        notes: "",
        status: "active",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
      })
    ).rejects.toThrow("请重新登录")
  })

  it("旧 localStorage 数据只迁移一次并归属首次执行迁移的账号", async () => {
    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
      storage.setItem(key, JSON.stringify([{ id: `legacy-${key}` }]))
    }
    switchAccount("account-a")

    const firstRead = await productRepository.getAll()
    migrateLegacyBusinessData("account-a")

    expect(firstRead).toEqual([
      expect.objectContaining({
        id: `legacy-${PRODUCTS_KEY}`,
        accountId: "account-a",
      }),
    ])
    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
      const records = JSON.parse(storage.getItem(key) || "[]")
      expect(records).toEqual([expect.objectContaining({ accountId: "account-a" })])
    }
    expect(storage.getItem(getAccountScopeMigrationKey())).not.toBeNull()

    switchAccount("account-b")
    expect(await productRepository.getAll()).toEqual([])
  })
})
