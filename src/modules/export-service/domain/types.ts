export type ExportLineItem = {
  productCode?: string
  productName: string
  spec: string
  composition?: string
  color?: string
  bulkMoq?: string
  unit: string
  quantity: number
  taxExcludedUnitPrice?: number | null
  unitPrice: number
  lineAmount: number
  dyeingFee?: string
  leadTime?: string
  lineRemark?: string
}

export type ExportHeader = {
  documentNo: string
  date: string
  counterpartyLabel: string
  counterpartyName: string
  remark?: string
}

export type ExportTotals = {
  totalAmount: number
  lineCount: number
}

export type ExportMeta = {
  exportedAt: string
  exportedBy: string
}

export type ExportPayload = {
  documentType: "purchase" | "sales" | "quote"
  documentNo: string
  header: ExportHeader
  lineItems: ExportLineItem[]
  totals: ExportTotals
  meta: ExportMeta
}

export type ExportFormat = "print" | "sheet"

export type ExportResult = {
  success: boolean
  message: string
  format: ExportFormat
  filename: string
}
