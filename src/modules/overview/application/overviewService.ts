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

export type ProductTypeSkuItem = {
  productType: string
  skuCount: number
}

export type MonthlySalesMetric = {
  monthKey: string
  monthLabel: string
  quantity: number
  amount: number
}

export type ProductTypeSalesSeries = {
  productType: string
  months: MonthlySalesMetric[]
}

export type OverviewDashboardData = {
  productTypeSkuItems: ProductTypeSkuItem[]
  productTypes: string[]
  salesSeries: ProductTypeSalesSeries[]
}

export type OverviewData = {
  recentRecords: RecentRecord[]
  stockItems: StockItem[]
  activeProductCount: number
  activeCounterpartyCount: number
  totalProductCount: number
  totalCounterpartyCount: number
  lowStockCount: number
  dashboard: OverviewDashboardData
}

const RECENT_LIMIT = 8
const LOW_STOCK_THRESHOLD = 10
const DASHBOARD_MONTH_COUNT = 6
const UNCATEGORIZED_PRODUCT_TYPE = "未分类"

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

function normalizeProductType(productType?: string): string {
  const trimmed = productType?.trim()
  return trimmed || UNCATEGORIZED_PRODUCT_TYPE
}

function getRecentMonths(count: number): MonthlySalesMetric[] {
  const now = new Date()
  const months: MonthlySalesMetric[] = []

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    months.push({
      monthKey: `${year}-${String(month).padStart(2, "0")}`,
      monthLabel: `${String(year).slice(2)}/${String(month).padStart(2, "0")}`,
      quantity: 0,
      amount: 0,
    })
  }

  return months
}

function createEmptyMonthMap(months: MonthlySalesMetric[]): Map<string, MonthlySalesMetric> {
  return new Map(
    months.map((month) => [
      month.monthKey,
      {
        ...month,
      },
    ])
  )
}

function buildDashboardData(
  products: Product[],
  sales: Awaited<ReturnType<typeof listSalesOrders>>
): OverviewDashboardData {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const skuCountByType = new Map<string, number>()

  for (const product of products) {
    const productType = normalizeProductType(product.productType)
    skuCountByType.set(productType, (skuCountByType.get(productType) ?? 0) + 1)
  }

  const baseMonths = getRecentMonths(DASHBOARD_MONTH_COUNT)
  const monthKeys = new Set(baseMonths.map((month) => month.monthKey))
  const salesByType = new Map<string, Map<string, MonthlySalesMetric>>()

  function ensureSeries(productType: string) {
    if (!salesByType.has(productType)) {
      salesByType.set(productType, createEmptyMonthMap(baseMonths))
    }
    return salesByType.get(productType)!
  }

  for (const productType of skuCountByType.keys()) {
    ensureSeries(productType)
  }

  for (const order of sales) {
    const happenedAt = new Date(order.happenedAt)
    const monthKey = `${happenedAt.getFullYear()}-${String(happenedAt.getMonth() + 1).padStart(2, "0")}`
    if (!monthKeys.has(monthKey)) continue

    for (const line of order.lines) {
      const productType = normalizeProductType(productMap.get(line.productId)?.productType)
      const monthMetric = ensureSeries(productType).get(monthKey)
      if (!monthMetric) continue

      monthMetric.quantity += line.quantity
      monthMetric.amount = Math.round((monthMetric.amount + line.lineAmount) * 100) / 100
    }
  }

  const productTypeSkuItems = Array.from(skuCountByType.entries())
    .map(([productType, skuCount]) => ({ productType, skuCount }))
    .sort(
      (a, b) => b.skuCount - a.skuCount || a.productType.localeCompare(b.productType, "zh-Hans-CN")
    )

  const productTypes = Array.from(salesByType.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED_PRODUCT_TYPE) return 1
    if (b === UNCATEGORIZED_PRODUCT_TYPE) return -1
    return a.localeCompare(b, "zh-Hans-CN")
  })

  const salesSeries = productTypes.map((productType) => ({
    productType,
    months: Array.from(ensureSeries(productType).values()),
  }))

  return {
    productTypeSkuItems,
    productTypes,
    salesSeries,
  }
}

export async function fetchOverviewData(): Promise<OverviewData> {
  const [purchases, sales, quotes, products, counterparties, snapshots] = await Promise.all([
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
    dashboard: buildDashboardData(products, sales),
  }
}
