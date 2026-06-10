import type { ExportPayload, ExportHeader, ExportLineItem, ExportTotals } from "../domain/types"
import type { PurchaseOrder } from "../../document-core/purchases/domain/types"
import type { SalesOrder } from "../../document-core/sales/domain/types"
import type { QuoteOrder } from "../../document-core/quotes/domain/types"
import { AppError, requireCurrentAccountId } from "../../../shared"

function assertExportOwnership(order: { accountId: string }): void {
  if (order.accountId !== requireCurrentAccountId()) {
    throw new AppError("UNAUTHORIZED", "不能导出其他账号的单据")
  }
}

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
  }>
): ExportLineItem[] {
  return lines.map((l) => ({
    productCode: l.productCode,
    productName: l.productName,
    spec: l.spec,
    composition: l.composition,
    color: l.color,
    bulkMoq: l.bulkMoq,
    unit: l.unit,
    quantity: l.quantity,
    taxExcludedUnitPrice: l.taxExcludedUnitPrice,
    unitPrice: l.unitPrice,
    lineAmount: l.lineAmount,
    dyeingFee: l.dyeingFee,
    leadTime: l.leadTime,
    lineRemark: l.lineRemark,
  }))
}

function buildTotals(totalAmount: number, lineCount: number): ExportTotals {
  return { totalAmount, lineCount }
}

export function buildPurchaseExportPayload(
  order: PurchaseOrder,
  exportedBy?: string
): ExportPayload {
  assertExportOwnership(order)
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
  assertExportOwnership(order)
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
  assertExportOwnership(order)
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
