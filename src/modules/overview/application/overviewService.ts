import { listPurchaseOrders } from "../../document-core/purchases/application/purchaseService"
import { listSalesOrders } from "../../document-core/sales/application/salesService"
import { listQuoteOrders } from "../../document-core/quotes/application/quoteService"
import { getStockSnapshot } from "../../inventory-engine"
import { productRepository } from "../../master-data/products/infrastructure/productRepository"
import { counterpartyRepository } from "../../master-data/counterparties/infrastructure/counterpartyRepository"
import type { Product } from "../../master-data/products/domain/types"
import type { Counterparty } from "../../master-data/counterparties/domain/types"
import type { CurrentStockSnapshot } from "../../inventory-engine/domain/types"

export type RecentRecord = {
  id: string
  type: "purchase" | "sales" | "quote"
  documentNo: string
  counterpartyName: string
  happenedAt: string
  totalAmount: number
  route: string
}

export type StockItem = {
  productId: string
  productName: string
  spec: string
  unit: string
  quantity: number
}

export type OverviewData = {
  recentRecords: RecentRecord[]
  stockItems: StockItem[]
  activeProductCount: number
  activeCounterpartyCount: number
  totalProductCount: number
  totalCounterpartyCount: number
  lowStockCount: number
}

const RECENT_LIMIT = 8
const LOW_STOCK_THRESHOLD = 10

async function fetchProducts(): Promise<Product[]> {
  try {
    return await productRepository.getAll()
  } catch {
    return []
  }
}

async function fetchCounterparties(): Promise<Counterparty[]> {
  try {
    return await counterpartyRepository.getAll()
  } catch {
    return []
  }
}

async function fetchStockSnapshots(): Promise<CurrentStockSnapshot[]> {
  try {
    return await getStockSnapshot()
  } catch {
    return []
  }
}

export async function fetchOverviewData(): Promise<OverviewData> {
  const [purchases, sales, quotes, products, counterparties, snapshots] =
    await Promise.all([
      listPurchaseOrders().catch(() => []),
      listSalesOrders().catch(() => []),
      listQuoteOrders().catch(() => []),
      fetchProducts(),
      fetchCounterparties(),
      fetchStockSnapshots(),
    ])

  const productMap = new Map(products.map((p) => [p.id, p]))
  const activeProducts = products.filter((p) => p.status === "active")
  const activeCounterparties = counterparties.filter((c) => c.status === "active")


  const stockItems: StockItem[] = snapshots
    .filter((s) => s.quantity !== 0)
    .map((s) => {
      const product = productMap.get(s.productId)
      return {
        productId: s.productId,
        productName: product?.name ?? "未知货品",
        spec: product?.spec ?? "",
        unit: product?.unit ?? "",
        quantity: s.quantity,
      }
    })
    .sort((a, b) => a.quantity - b.quantity)

  const lowStockCount = snapshots.filter((s) => {
    const qty = s.quantity
    return qty < LOW_STOCK_THRESHOLD && qty > 0
  }).length

  const allRecords: RecentRecord[] = [
    ...purchases.slice(0, RECENT_LIMIT).map((o) => ({
      id: o.id,
      type: "purchase" as const,
      documentNo: o.documentNo,
      counterpartyName: o.supplierName,
      happenedAt: o.happenedAt,
      totalAmount: o.totalAmount,
      route: `/purchases/${o.id}`,
    })),
    ...sales.slice(0, RECENT_LIMIT).map((o) => ({
      id: o.id,
      type: "sales" as const,
      documentNo: o.documentNo,
      counterpartyName: o.customerName,
      happenedAt: o.happenedAt,
      totalAmount: o.totalAmount,
      route: `/sales/${o.id}`,
    })),
    ...quotes.slice(0, RECENT_LIMIT).map((o) => ({
      id: o.id,
      type: "quote" as const,
      documentNo: o.documentNo,
      counterpartyName: o.customerName,
      happenedAt: o.happenedAt,
      totalAmount: o.totalAmount,
      route: `/quotes/${o.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
    .slice(0, RECENT_LIMIT)

  return {
    recentRecords: allRecords,
    stockItems,
    activeProductCount: activeProducts.length,
    activeCounterpartyCount: activeCounterparties.length,
    totalProductCount: products.length,
    totalCounterpartyCount: counterparties.length,
    lowStockCount,
  }
}
