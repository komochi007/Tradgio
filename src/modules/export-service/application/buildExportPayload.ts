import type { ExportPayload, ExportHeader, ExportLineItem, ExportTotals } from "../domain/types"
import type { PurchaseOrder } from "../../document-core/purchases/domain/types"
import type { SalesOrder } from "../../document-core/sales/domain/types"
import type { QuoteOrder } from "../../document-core/quotes/domain/types"

function buildHeader(
  documentNo: string,
  date: string,
  counterpartyLabel: string,
  counterpartyName: string,
  remark?: string
): ExportHeader {
  return { documentNo, date, counterpartyLabel, counterpartyName, remark }
}

function buildLines(
  lines: Array<{
    productName: string
    spec: string
    unit: string
    quantity: number
    unitPrice: number
    lineAmount: number
  }>
): ExportLineItem[] {
  return lines.map((l) => ({
    productName: l.productName,
    spec: l.spec,
    unit: l.unit,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineAmount: l.lineAmount,
  }))
}

function buildTotals(totalAmount: number, lineCount: number): ExportTotals {
  return { totalAmount, lineCount }
}

export function buildPurchaseExportPayload(
  order: PurchaseOrder,
  exportedBy?: string
): ExportPayload {
  return {
    documentType: "purchase",
    documentNo: order.documentNo,
    header: buildHeader(
      order.documentNo,
      order.happenedAt,
      "供应商",
      order.supplierName,
      order.remark
    ),
    lineItems: buildLines(order.lines),
    totals: buildTotals(order.totalAmount, order.lines.length),
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: exportedBy ?? "当前用户",
    },
  }
}

export function buildSalesExportPayload(
  order: SalesOrder,
  exportedBy?: string
): ExportPayload {
  return {
    documentType: "sales",
    documentNo: order.documentNo,
    header: buildHeader(
      order.documentNo,
      order.happenedAt,
      "客户",
      order.customerName,
      order.remark
    ),
    lineItems: buildLines(order.lines),
    totals: buildTotals(order.totalAmount, order.lines.length),
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: exportedBy ?? "当前用户",
    },
  }
}

export function buildQuoteExportPayload(
  order: QuoteOrder,
  exportedBy?: string
): ExportPayload {
  return {
    documentType: "quote",
    documentNo: order.documentNo,
    header: buildHeader(
      order.documentNo,
      order.happenedAt,
      "客户",
      order.customerName,
      order.remark
    ),
    lineItems: buildLines(order.lines),
    totals: buildTotals(order.totalAmount, order.lines.length),
    meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: exportedBy ?? "当前用户",
    },
  }
}
