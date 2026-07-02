import type { SearchResult, SearchResultType } from "../domain/types"
import { listPurchaseOrders } from "../../document-core/purchases/application/purchaseService"
import { listSalesOrders } from "../../document-core/sales/application/salesService"
import { listQuoteOrders } from "../../document-core/quotes/application/quoteService"
import { listContractRecords } from "../../contract-center/application/contractService"

const MODULE_LABELS: Record<SearchResultType, string> = {
  purchase: "进货单",
  sales: "出货单",
  quote: "报价单",
  contract: "合同",
}

function matchKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

function formatMatchedField(
  type: SearchResultType,
  record: Record<string, unknown>,
  keyword: string
): string {
  const k = keyword.toLowerCase()

  const docNo = (record.documentNo || record.contractNo || "") as string
  if (matchKeyword(docNo, k)) return `${MODULE_LABELS[type]}编号`

  if (type === "sales") {
    const customerOrderNo = (record.customerOrderNo || "") as string
    if (matchKeyword(customerOrderNo, k)) return "订单号"
  }

  if (type === "contract") {
    const title = (record.title || "") as string
    if (matchKeyword(title, k)) return "合同标题"
  }

  const counterparty = (record.customerName || record.supplierName || "") as string
  if (matchKeyword(counterparty, k)) {
    return type === "purchase" ? "供应商" : "客户"
  }

  if (type !== "contract") {
    const lines = (record.lines || []) as Array<{ productName: string }>
    if (lines.some((l) => matchKeyword(l.productName, k))) {
      return "货品名称"
    }
  }

  return MODULE_LABELS[type]
}

export async function searchDocuments(keyword: string): Promise<SearchResult[]> {
  if (!keyword.trim()) return []

  const k = keyword.trim()

  const [purchases, sales, quotes, contracts] = await Promise.all([
    listPurchaseOrders().catch(() => []),
    listSalesOrders().catch(() => []),
    listQuoteOrders().catch(() => []),
    listContractRecords().catch(() => []),
  ])

  const purchaseResults: SearchResult[] = purchases
    .filter(
      (o) =>
        matchKeyword(o.documentNo, k) ||
        matchKeyword(o.supplierName, k) ||
        o.lines.some((l) => matchKeyword(l.productName, k))
    )
    .map((o) => ({
      id: o.id,
      type: "purchase" as const,
      title: o.documentNo,
      subtitle: o.supplierName,
      matchedField: formatMatchedField("purchase", o as unknown as Record<string, unknown>, k),
      happenedAt: o.happenedAt,
      targetRoute: `/purchases/${o.id}`,
    }))

  const salesResults: SearchResult[] = sales
    .filter(
      (o) =>
        matchKeyword(o.documentNo, k) ||
        matchKeyword(o.customerOrderNo ?? "", k) ||
        matchKeyword(o.customerName, k) ||
        o.lines.some((l) => matchKeyword(l.productName, k))
    )
    .map((o) => ({
      id: o.id,
      type: "sales" as const,
      title: o.documentNo,
      subtitle: o.customerName,
      matchedField: formatMatchedField("sales", o as unknown as Record<string, unknown>, k),
      happenedAt: o.happenedAt,
      targetRoute: `/sales/${o.id}`,
    }))

  const quoteResults: SearchResult[] = quotes
    .filter(
      (o) =>
        matchKeyword(o.documentNo, k) ||
        matchKeyword(o.customerName, k) ||
        o.lines.some((l) => matchKeyword(l.productName, k))
    )
    .map((o) => ({
      id: o.id,
      type: "quote" as const,
      title: o.documentNo,
      subtitle: o.customerName,
      matchedField: formatMatchedField("quote", o as unknown as Record<string, unknown>, k),
      happenedAt: o.happenedAt,
      targetRoute: `/quotes/${o.id}`,
    }))

  const contractResults: SearchResult[] = contracts
    .filter(
      (r) =>
        matchKeyword(r.contractNo, k) || matchKeyword(r.title, k) || matchKeyword(r.customerName, k)
    )
    .map((r) => ({
      id: r.id,
      type: "contract" as const,
      title: r.contractNo,
      subtitle: r.title,
      matchedField: formatMatchedField("contract", r as unknown as Record<string, unknown>, k),
      happenedAt: r.signDate,
      targetRoute: `/contracts/${r.id}`,
    }))

  return [...purchaseResults, ...salesResults, ...quoteResults, ...contractResults].sort(
    (a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()
  )
}
