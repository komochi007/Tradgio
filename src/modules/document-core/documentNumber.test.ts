import { beforeEach, describe, expect, it } from "vitest"
import { generateNextDocumentNumber } from "../../shared"
import { counterpartyRepository } from "../master-data/counterparties"
import { productRepository } from "../master-data/products"
import { generateDocumentNo as generatePurchaseDocumentNo, purchaseRepository } from "./purchases"
import type { PurchaseOrder } from "./purchases"
import { generateDocumentNo as generateSalesDocumentNo, salesRepository } from "./sales"
import type { SalesOrder } from "./sales"
import {
  createQuoteOrder,
  generateDocumentNo as generateQuoteDocumentNo,
  quoteRepository,
} from "./quotes"
import type { QuoteFormData, QuoteOrder } from "./quotes"
import {
  contractRepository,
  generateDocumentNo as generateContractDocumentNo,
} from "../contract-center"
import type { ContractRecord } from "../contract-center"

const SESSION_KEY = "tradgio_session"

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

function switchAccount(accountId: string): void {
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      account: {
        id: accountId,
        username: accountId,
        createdAt: "2026-06-10T00:00:00.000Z",
      },
      token: `${accountId}-token`,
      issuedAt: "2026-06-10T00:00:00.000Z",
    })
  )
}

function purchaseRecord(id: string, documentNo: string): PurchaseOrder {
  return { id, accountId: "", documentNo } as PurchaseOrder
}

function salesRecord(id: string, documentNo: string): SalesOrder {
  return { id, accountId: "", documentNo } as SalesOrder
}

function quoteRecord(id: string, documentNo: string): QuoteOrder {
  return { id, accountId: "", documentNo } as QuoteOrder
}

function contractRecord(id: string, contractNo: string): ContractRecord {
  return { id, accountId: "", contractNo } as ContractRecord
}

async function createQuoteMasterData(): Promise<{
  productId: string
  customerId: string
}> {
  const product = await productRepository.create({
    id: "quote-product",
    productCode: "P001",
    name: "并发报价货品",
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
  const customer = await counterpartyRepository.create({
    id: "quote-customer",
    name: "并发报价客户",
    type: "customer",
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
    status: "active",
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
  })
  return { productId: product.id, customerId: customer.id }
}

function quoteForm(productId: string, customerId: string, remark: string): QuoteFormData {
  return {
    customerId,
    customerName: "并发报价客户",
    happenedAt: "2026-06-10",
    remark,
    lines: [
      {
        key: remark,
        productId,
        productName: "并发报价货品",
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

beforeEach(() => {
  storage.clear()
  switchAccount("account-a")
})

describe("单据编号生成", () => {
  it.each([
    ["purchase", "JH20260608"],
    ["sales", "CH20260608"],
    ["quote", "BJ20260608"],
    ["contract", "HT260608"],
  ] as const)("%s 按当月最大流水递增", (type, expected) => {
    const prefix = expected.slice(0, -2)
    const numbers = [
      `${prefix}07`,
      `${prefix}01`,
      `${prefix}04`,
      `${prefix.slice(0, -2)}0599`,
      `${prefix}100`,
      `${prefix}AA`,
    ]

    expect(generateNextDocumentNumber(type, numbers, new Date(2026, 5, 10))).toBe(expected)
  })

  it("四类编号达到 99 后均明确阻止创建", () => {
    const date = new Date(2026, 5, 10)
    const cases = [
      ["purchase", "JH20260699"],
      ["sales", "CH20260699"],
      ["quote", "BJ20260699"],
      ["contract", "HT260699"],
    ] as const

    for (const [type, documentNo] of cases) {
      expect(() => generateNextDocumentNumber(type, [documentNo], date)).toThrow(
        "编号已达到 99，请升级编号规则"
      )
    }
  })

  it("删除中间记录后继续使用历史最大流水的下一号", async () => {
    const date = new Date(2026, 5, 10)
    await purchaseRepository.create(purchaseRecord("purchase-1", "JH20260601"))
    await purchaseRepository.create(purchaseRecord("purchase-2", "JH20260602"))
    await purchaseRepository.create(purchaseRecord("purchase-3", "JH20260603"))

    await purchaseRepository.remove("purchase-2")

    expect(await generatePurchaseDocumentNo(date)).toBe("JH20260604")
  })

  it("四类 Repository 按当前账号读取最大号且允许跨账号同号", async () => {
    const date = new Date(2026, 5, 10)
    await purchaseRepository.create(purchaseRecord("purchase-a", "JH20260607"))
    await salesRepository.create(salesRecord("sales-a", "CH20260607"))
    await quoteRepository.create(quoteRecord("quote-a", "BJ20260607"))
    await contractRepository.create(contractRecord("contract-a", "HT260607"))

    expect(await generatePurchaseDocumentNo(date)).toBe("JH20260608")
    expect(await generateSalesDocumentNo(date)).toBe("CH20260608")
    expect(await generateQuoteDocumentNo(date)).toBe("BJ20260608")
    expect(await generateContractDocumentNo(date)).toBe("HT260608")

    switchAccount("account-b")
    expect(await generatePurchaseDocumentNo(date)).toBe("JH20260601")
    expect(await generateSalesDocumentNo(date)).toBe("CH20260601")
    expect(await generateQuoteDocumentNo(date)).toBe("BJ20260601")
    expect(await generateContractDocumentNo(date)).toBe("HT260601")

    await purchaseRepository.create(purchaseRecord("purchase-b", "JH20260607"))
    await salesRepository.create(salesRecord("sales-b", "CH20260607"))
    await quoteRepository.create(quoteRecord("quote-b", "BJ20260607"))
    await contractRepository.create(contractRecord("contract-b", "HT260607"))
  })

  it("四类 Repository 拒绝当前账号内重复编号", async () => {
    await purchaseRepository.create(purchaseRecord("purchase-1", "JH20260601"))
    await salesRepository.create(salesRecord("sales-1", "CH20260601"))
    await quoteRepository.create(quoteRecord("quote-1", "BJ20260601"))
    await contractRepository.create(contractRecord("contract-1", "HT260601"))

    await expect(
      purchaseRepository.create(purchaseRecord("purchase-2", "JH20260601"))
    ).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(
      salesRepository.create(salesRecord("sales-2", "CH20260601"))
    ).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(
      quoteRepository.create(quoteRecord("quote-2", "BJ20260601"))
    ).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(
      contractRepository.create(contractRecord("contract-2", "HT260601"))
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("并发创建报价单时生成不同编号", async () => {
    const { productId, customerId } = await createQuoteMasterData()
    const orders = await Promise.all([
      createQuoteOrder(quoteForm(productId, customerId, "并发一")),
      createQuoteOrder(quoteForm(productId, customerId, "并发二")),
    ])

    expect(new Set(orders.map((order) => order.documentNo)).size).toBe(2)
    expect(orders.map((order) => order.documentNo.slice(-2)).sort()).toEqual(["01", "02"])
  })
})
