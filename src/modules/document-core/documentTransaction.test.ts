import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder } from "./purchases"
import type { PurchaseFormData } from "./purchases"
import { createSalesOrder, deleteSalesOrder, updateSalesOrder } from "./sales"
import { validateSalesForm } from "./sales"
import type { SalesFormData } from "./sales"
import { purchaseRepository } from "./purchases"
import { salesRepository } from "./sales"
import { ledgerRepository, snapshotRepository } from "../inventory-engine"
import type { IndexedDbRepository } from "../../shared"
import { resetTradgioDatabase } from "../../test/indexedDb"

const SESSION_KEY = "tradgio_session"
const PRODUCTS_KEY = "tradgio_products"
const COUNTERPARTIES_KEY = "tradgio_counterparties"

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

function purchaseForm(quantity = "5"): PurchaseFormData {
  return {
    supplierId: "supplier-1",
    supplierName: "测试供应商",
    happenedAt: "2026-06-10",
    remark: "",
    lines: [
      {
        key: "purchase-line-1",
        productId: "product-1",
        productName: "测试货品",
        spec: "A1",
        unit: "件",
        quantity,
        unitPrice: "10",
      },
    ],
  }
}

function salesForm(quantity = "2"): SalesFormData {
  return {
    customerOrderNo: "SO-20260610",
    customerId: "customer-1",
    customerName: "测试客户",
    happenedAt: "2026-06-10",
    remark: "",
    lines: [
      {
        key: "sales-line-1",
        productId: "product-1",
        productCode: "P-001",
        productName: "测试货品",
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

async function readBusinessState() {
  return {
    purchases: await purchaseRepository.getAll(),
    sales: await salesRepository.getAll(),
    ledger: await ledgerRepository.getAll(),
    snapshots: await snapshotRepository.getAll(),
  }
}

function failNextTransactionMethod(
  repository: IndexedDbRepository<any>,
  method: "create" | "update"
): void {
  const originalBind = repository.bind.bind(repository)
  vi.spyOn(repository, "bind").mockImplementationOnce((transaction) => {
    const bound = originalBind(transaction)
    return {
      ...bound,
      [method]: async () => {
        throw new Error(`注入事务失败: ${repository.storeName}.${method}`)
      },
    }
  })
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await resetTradgioDatabase()
  storage.clear()
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      account: {
        id: "account-test",
        username: "test",
        createdAt: "2026-06-10T00:00:00.000Z",
      },
      token: "test-token",
      issuedAt: "2026-06-10T00:00:00.000Z",
    })
  )
  storage.setItem(
    PRODUCTS_KEY,
    JSON.stringify([
      {
        id: "product-1",
        productCode: "P-001",
        name: "测试货品",
        spec: "A1",
        unit: "件",
        productType: "测试",
        material: "",
        defaultPurchasePrice: 10,
        defaultSalesPrice: 20,
        notes: "",
        status: "active",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    ])
  )
  storage.setItem(
    COUNTERPARTIES_KEY,
    JSON.stringify([
      {
        id: "supplier-1",
        name: "测试供应商",
        type: "supplier",
        contactPerson: "",
        phone: "",
        address: "",
        notes: "",
        status: "active",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
      {
        id: "customer-1",
        name: "测试客户",
        type: "customer",
        contactPerson: "",
        phone: "",
        address: "",
        notes: "",
        status: "active",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    ])
  )
})

describe("单据与库存 IndexedDB 原子保存", () => {
  it("出货单订单号必填", () => {
    expect(
      validateSalesForm({
        ...salesForm(),
        customerOrderNo: "  ",
      })
    ).toMatchObject({
      customerOrderNo: "请输入订单号",
    })
  })

  it("出货单保存时持久化手动订单号并与系统单据编号区分", async () => {
    const order = await createSalesOrder({
      ...salesForm(),
      customerOrderNo: "  SO-MANUAL-001  ",
    })

    expect(order.customerOrderNo).toBe("SO-MANUAL-001")
    expect(order.documentNo).not.toBe(order.customerOrderNo)
  })

  it.each([
    ["单据", purchaseRepository, "create"],
    ["流水", ledgerRepository, "create"],
    ["快照", snapshotRepository, "create"],
  ] as const)("进货创建在%s写入失败后不留半成品", async (_label, repository, method) => {
    failNextTransactionMethod(repository, method)

    await expect(createPurchaseOrder(purchaseForm())).rejects.toThrow("注入事务失败")
    expect(await readBusinessState()).toEqual({
      purchases: [],
      sales: [],
      ledger: [],
      snapshots: [],
    })
  })

  it.each([
    ["单据", purchaseRepository, "update"],
    ["流水", ledgerRepository, "create"],
    ["快照", snapshotRepository, "update"],
  ] as const)("进货编辑在%s写入失败后恢复提交前状态", async (_label, repository, method) => {
    const order = await createPurchaseOrder(purchaseForm())
    const before = await readBusinessState()
    failNextTransactionMethod(repository, method)

    await expect(updatePurchaseOrder(order.id, purchaseForm("8"))).rejects.toThrow("注入事务失败")
    expect(await readBusinessState()).toEqual(before)
  })

  it("失败后重试只产生一次库存影响", async () => {
    failNextTransactionMethod(ledgerRepository, "create")
    await expect(createPurchaseOrder(purchaseForm())).rejects.toThrow("注入事务失败")

    await createPurchaseOrder(purchaseForm())
    const state = await readBusinessState()
    expect(state.purchases).toHaveLength(1)
    expect(state.ledger).toHaveLength(1)
    expect(state.snapshots).toEqual([expect.objectContaining({ quantity: 5 })])
  })

  it("并发重复提交相同进货表单只执行一次", async () => {
    const [first, second] = await Promise.all([
      createPurchaseOrder(purchaseForm()),
      createPurchaseOrder(purchaseForm()),
    ])

    const state = await readBusinessState()
    expect(second.id).toBe(first.id)
    expect(state.purchases).toHaveLength(1)
    expect(state.ledger).toHaveLength(1)
    expect(state.snapshots).toEqual([expect.objectContaining({ quantity: 5 })])
  })

  it("不同进货请求并发提交时按顺序保存且库存不互相覆盖", async () => {
    await Promise.all([
      createPurchaseOrder(purchaseForm("5")),
      createPurchaseOrder(purchaseForm("6")),
    ])

    const state = await readBusinessState()
    expect(state.purchases).toHaveLength(2)
    expect(state.ledger).toHaveLength(2)
    expect(state.snapshots).toEqual([expect.objectContaining({ quantity: 11 })])
  })

  it("出货编辑的快照写入失败后恢复单据、流水和库存", async () => {
    const order = await createSalesOrder(salesForm())
    const before = await readBusinessState()
    failNextTransactionMethod(snapshotRepository, "update")

    await expect(updateSalesOrder(order.id, salesForm("3"))).rejects.toThrow("注入事务失败")
    expect(await readBusinessState()).toEqual(before)
  })

  it("进货单和出货单删除在实现库存冲销前保持关闭", async () => {
    await expect(deletePurchaseOrder("purchase-1")).rejects.toThrow("删除暂未开放")
    await expect(deleteSalesOrder("sales-1")).rejects.toThrow("删除暂未开放")
  })
})
