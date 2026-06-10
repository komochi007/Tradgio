import { beforeEach, describe, expect, it } from "vitest"
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrder,
} from "./purchases"
import type { PurchaseFormData } from "./purchases"
import {
  createSalesOrder,
  deleteSalesOrder,
  updateSalesOrder,
} from "./sales"
import type { SalesFormData } from "./sales"

const PURCHASES_KEY = "tradgio_purchase_orders"
const SALES_KEY = "tradgio_sales_orders"
const LEDGER_KEY = "tradgio_inventory_ledger"
const SNAPSHOTS_KEY = "tradgio_inventory_snapshots"

class FaultInjectableStorage implements Storage {
  private data = new Map<string, string>()
  private failureKey: string | null = null

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
    this.failureKey = null
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
    if (this.failureKey === key) {
      this.failureKey = null
      throw new Error(`注入写入失败: ${key}`)
    }
    this.data.set(key, value)
  }

  failNextWrite(key: string): void {
    this.failureKey = key
  }

  readCollection<T>(key: string): T[] {
    const raw = this.getItem(key)
    return raw ? JSON.parse(raw) : []
  }
}

const storage = new FaultInjectableStorage()

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

function readBusinessState() {
  return {
    purchases: storage.readCollection(PURCHASES_KEY),
    sales: storage.readCollection(SALES_KEY),
    ledger: storage.readCollection(LEDGER_KEY),
    snapshots: storage.readCollection(SNAPSHOTS_KEY),
  }
}

beforeEach(() => {
  storage.clear()
})

describe("单据与库存本地原子保存", () => {
  for (const failureKey of [PURCHASES_KEY, LEDGER_KEY, SNAPSHOTS_KEY]) {
    it(`进货创建在 ${failureKey} 写入失败后恢复全部状态`, async () => {
      storage.failNextWrite(failureKey)

      await expect(createPurchaseOrder(purchaseForm())).rejects.toThrow("注入写入失败")
      expect(readBusinessState()).toEqual({
        purchases: [],
        sales: [],
        ledger: [],
        snapshots: [],
      })
    })
  }

  for (const failureKey of [PURCHASES_KEY, LEDGER_KEY, SNAPSHOTS_KEY]) {
    it(`进货编辑在 ${failureKey} 写入失败后恢复提交前状态`, async () => {
      const order = await createPurchaseOrder(purchaseForm())
      const before = readBusinessState()
      storage.failNextWrite(failureKey)

      await expect(updatePurchaseOrder(order.id, purchaseForm("8"))).rejects.toThrow(
        "注入写入失败"
      )
      expect(readBusinessState()).toEqual(before)
    })
  }

  it("失败后重试只产生一次库存影响", async () => {
    storage.failNextWrite(LEDGER_KEY)
    await expect(createPurchaseOrder(purchaseForm())).rejects.toThrow("注入写入失败")

    await createPurchaseOrder(purchaseForm())

    expect(storage.readCollection(PURCHASES_KEY)).toHaveLength(1)
    expect(storage.readCollection(LEDGER_KEY)).toHaveLength(1)
    expect(storage.readCollection<{ quantity: number }>(SNAPSHOTS_KEY)).toEqual([
      expect.objectContaining({ quantity: 5 }),
    ])
  })

  it("并发重复提交相同进货表单只执行一次", async () => {
    const [first, second] = await Promise.all([
      createPurchaseOrder(purchaseForm()),
      createPurchaseOrder(purchaseForm()),
    ])

    expect(second.id).toBe(first.id)
    expect(storage.readCollection(PURCHASES_KEY)).toHaveLength(1)
    expect(storage.readCollection(LEDGER_KEY)).toHaveLength(1)
    expect(storage.readCollection<{ quantity: number }>(SNAPSHOTS_KEY)).toEqual([
      expect.objectContaining({ quantity: 5 }),
    ])
  })

  it("不同进货请求并发提交时按顺序保存且库存不互相覆盖", async () => {
    await Promise.all([
      createPurchaseOrder(purchaseForm("5")),
      createPurchaseOrder(purchaseForm("6")),
    ])

    expect(storage.readCollection(PURCHASES_KEY)).toHaveLength(2)
    expect(storage.readCollection(LEDGER_KEY)).toHaveLength(2)
    expect(storage.readCollection<{ quantity: number }>(SNAPSHOTS_KEY)).toEqual([
      expect.objectContaining({ quantity: 11 }),
    ])
  })

  it("出货编辑的快照写入失败后恢复单据、流水和库存", async () => {
    const order = await createSalesOrder(salesForm())
    const before = readBusinessState()
    storage.failNextWrite(SNAPSHOTS_KEY)

    await expect(updateSalesOrder(order.id, salesForm("3"))).rejects.toThrow(
      "注入写入失败"
    )
    expect(readBusinessState()).toEqual(before)
  })

  it("进货单和出货单删除在实现库存冲销前保持关闭", async () => {
    await expect(deletePurchaseOrder("purchase-1")).rejects.toThrow("删除暂未开放")
    await expect(deleteSalesOrder("sales-1")).rejects.toThrow("删除暂未开放")
  })
})
