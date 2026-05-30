export type SearchResultType = "purchase" | "sales" | "quote" | "contract"

export type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  matchedField: string
  happenedAt: string
  targetRoute: string
}

export const typeLabel: Record<SearchResultType, string> = {
  purchase: "进货单",
  sales: "出货单",
  quote: "报价单",
  contract: "合同",
}

export const typeVariant: Record<SearchResultType, "success" | "warning" | "info"> = {
  purchase: "success",
  sales: "warning",
  quote: "info",
  contract: "info",
}
