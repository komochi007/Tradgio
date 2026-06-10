import ExcelJS from "exceljs"
import type { ExportPayload, ExportFormat, ExportResult } from "../domain/types"

function formatPayloadForPrint(payload: ExportPayload): string {
  const { header, lineItems, totals } = payload
  const lines = [
    `${header.counterpartyLabel}: ${header.counterpartyName}`,
    `日期: ${header.date}`,
    `编号: ${header.documentNo}`,
    header.remark ? `备注: ${header.remark}` : "",
    "",
    "──────────────────────────────",
    "货品名称\t规格\t单位\t数量\t单价\t金额",
    ...lineItems.map(
      (l) =>
        `${l.productName}\t${l.spec || "-"}\t${l.unit || "-"}\t${l.quantity}\t¥${l.unitPrice.toFixed(2)}\t¥${l.lineAmount.toFixed(2)}`
    ),
    "──────────────────────────────",
    `合计: ${totals.lineCount} 种货品, ¥${totals.totalAmount.toFixed(2)}`,
  ]
  return lines.filter(Boolean).join("\n")
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getFormatSuffix(format: ExportFormat): string {
  return format === "print" ? "打印版" : "模板Excel"
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function setCellValue(
  worksheet: ExcelJS.Worksheet,
  cellAddress: string,
  value: string | number | null | undefined
) {
  const cell = worksheet.getCell(cellAddress)
  cell.value = value ?? ""
}

function centerCell(cell: ExcelJS.Cell) {
  cell.alignment = {
    ...cell.alignment,
    horizontal: "center",
    vertical: "middle",
  }
}

function setThinBorder(cell: ExcelJS.Cell) {
  const border: Partial<ExcelJS.Border> = {
    style: "thin",
  }
  cell.border = {
    top: border,
    left: border,
    bottom: border,
    right: border,
  }
}

function styleDataRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  rowCount: number,
  startColumn: number,
  endColumn: number,
  includeBorder = false
) {
  for (let rowNumber = startRow; rowNumber < startRow + rowCount; rowNumber++) {
    for (let column = startColumn; column <= endColumn; column++) {
      const cell = worksheet.getCell(rowNumber, column)
      centerCell(cell)
      if (includeBorder) setThinBorder(cell)
    }
  }
}

function styleCurrencyCell(cell: ExcelJS.Cell, currency: "USD" | "RMB") {
  centerCell(cell)
  cell.numFmt = currency === "USD" ? "$#,##0.00" : "¥#,##0.00"
}

function cloneRowStyle(source: ExcelJS.Row, target: ExcelJS.Row) {
  target.height = source.height
  source.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = target.getCell(colNumber)
    targetCell.style = { ...cell.style }
    targetCell.numFmt = cell.numFmt
    if (cell.alignment) targetCell.alignment = { ...cell.alignment }
    if (cell.border) targetCell.border = { ...cell.border }
    if (cell.fill) targetCell.fill = { ...cell.fill }
    if (cell.font) targetCell.font = { ...cell.font }
  })
}

function ensureRows(
  worksheet: ExcelJS.Worksheet,
  templateRowCount: number,
  nextRow: number,
  lineCount: number
) {
  const requiredRows = Math.max(lineCount, templateRowCount)
  const extraRows = requiredRows - templateRowCount
  if (extraRows <= 0) return requiredRows

  worksheet.insertRows(nextRow, Array.from({ length: extraRows }, () => []), "i")
  const sourceRow = worksheet.getRow(nextRow - 1)
  for (let i = 0; i < extraRows; i++) {
    cloneRowStyle(sourceRow, worksheet.getRow(nextRow + i))
  }
  return requiredRows
}

function fillSalesTemplate(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) throw new Error("出货单模板缺少工作表")

  setCellValue(worksheet, "A4", `送货单  NO: ${payload.documentNo}`)
  setCellValue(
    worksheet,
    "A5",
    `收货单位：${payload.header.counterpartyName}     订单号：${payload.documentNo}     日期：${payload.header.date}`
  )

  const lineStartRow = 7
  const lineRows = ensureRows(worksheet, 2, 9, payload.lineItems.length)
  const totalRow = lineStartRow + lineRows

  for (let i = 0; i < lineRows; i++) {
    const rowNumber = lineStartRow + i
    const item = payload.lineItems[i]
    setCellValue(worksheet, `A${rowNumber}`, item?.productCode)
    setCellValue(worksheet, `B${rowNumber}`, item?.productName)
    setCellValue(worksheet, `C${rowNumber}`, item?.spec)
    setCellValue(worksheet, `D${rowNumber}`, item?.color)
    setCellValue(worksheet, `E${rowNumber}`, item?.unit)
    setCellValue(worksheet, `F${rowNumber}`, item?.quantity)
    setCellValue(worksheet, `G${rowNumber}`, item?.unitPrice)
    setCellValue(worksheet, `H${rowNumber}`, item?.lineAmount)
    setCellValue(worksheet, `I${rowNumber}`, item?.lineRemark)
  }

  styleDataRange(worksheet, lineStartRow, lineRows, 1, 9)
  for (let rowNumber = lineStartRow; rowNumber < lineStartRow + lineRows; rowNumber++) {
    styleCurrencyCell(worksheet.getCell(`G${rowNumber}`), "RMB")
    styleCurrencyCell(worksheet.getCell(`H${rowNumber}`), "RMB")
  }

  setCellValue(worksheet, `H${totalRow}`, payload.totals.totalAmount)
  styleCurrencyCell(worksheet.getCell(`H${totalRow}`), "RMB")
}

function fillQuoteTemplate(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) throw new Error("报价单模板缺少工作表")

  try {
    worksheet.unMergeCells("K10:K15")
  } catch {
  }

  setCellValue(
    worksheet,
    "A6",
    `TO: ${payload.header.counterpartyName}     日期：${payload.header.date}     编号：${payload.documentNo}`
  )

  const lineStartRow = 10
  const lineRows = ensureRows(worksheet, 6, 16, payload.lineItems.length)

  for (let i = 0; i < lineRows; i++) {
    const rowNumber = lineStartRow + i
    const item = payload.lineItems[i]
    setCellValue(worksheet, `A${rowNumber}`, item ? i + 1 : "")
    setCellValue(worksheet, `B${rowNumber}`, item?.productName)
    setCellValue(worksheet, `C${rowNumber}`, item?.composition)
    setCellValue(worksheet, `D${rowNumber}`, item?.spec)
    setCellValue(worksheet, `E${rowNumber}`, item?.color)
    setCellValue(worksheet, `F${rowNumber}`, item?.bulkMoq)
    setCellValue(worksheet, `G${rowNumber}`, item?.taxExcludedUnitPrice)
    setCellValue(worksheet, `H${rowNumber}`, item?.unitPrice)
    setCellValue(worksheet, `I${rowNumber}`, item?.dyeingFee)
    setCellValue(worksheet, `J${rowNumber}`, "")
    setCellValue(worksheet, `K${rowNumber}`, item?.leadTime)
  }

  styleDataRange(worksheet, lineStartRow, lineRows, 1, 11, true)

  for (let rowNumber = lineStartRow; rowNumber < lineStartRow + lineRows; rowNumber++) {
    styleCurrencyCell(worksheet.getCell(`G${rowNumber}`), "USD")
    styleCurrencyCell(worksheet.getCell(`H${rowNumber}`), "RMB")
  }

  const noteRow = lineStartRow + lineRows + 1
  if (payload.header.remark) {
    setCellValue(worksheet, `A${noteRow}`, `注：${payload.header.remark}`)
  }
}

async function exportTemplateExcel(payload: ExportPayload, baseFilename: string) {
  if (payload.documentType !== "sales" && payload.documentType !== "quote") {
    throw new Error("当前单据暂未配置模板 Excel")
  }

  const templateFile =
    payload.documentType === "sales"
      ? "sales-order-template.xlsx"
      : "quote-template.xlsx"
  const response = await fetch(`/templates/${templateFile}`)
  if (!response.ok) {
    throw new Error("模板文件读取失败")
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await response.arrayBuffer())

  if (payload.documentType === "sales") {
    fillSalesTemplate(workbook, payload)
  } else {
    fillQuoteTemplate(workbook, payload)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  downloadBlob(blob, `${baseFilename}.xlsx`)
}

export async function exportDocument(
  payload: ExportPayload,
  format: ExportFormat
): Promise<ExportResult> {
  const formatSuffix = getFormatSuffix(format)
  const baseFilename = `${payload.documentNo}${format === "print" ? "" : "-模板Excel"}`

  try {
    await delay(600)

    if (format === "print") {
      const content = formatPayloadForPrint(payload)

      if (typeof window !== "undefined") {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
        downloadBlob(blob, `${baseFilename}.txt`)
      }
    } else {
      if (typeof window !== "undefined") {
        await exportTemplateExcel(payload, baseFilename)
      }
    }

    return {
      success: true,
      message: `${formatSuffix}导出成功`,
      format,
      filename: baseFilename,
    }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error
          ? `导出失败: ${e.message}`
          : `${formatSuffix}导出失败，请重试`,
      format,
      filename: baseFilename,
    }
  }
}

export async function exportPrint(payload: ExportPayload): Promise<ExportResult> {
  return exportDocument(payload, "print")
}

export async function exportSheet(payload: ExportPayload): Promise<ExportResult> {
  return exportDocument(payload, "sheet")
}
