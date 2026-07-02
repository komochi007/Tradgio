import type ExcelJS from "exceljs"
import { PlatformAdapterError, mapPlatformError } from "../../../shared/platform"
import type {
  AdapterOperationOptions,
  ExportRequest,
  LocalExportAdapter,
} from "../../../shared/platform"
import type { ExportPayload } from "../domain/types"

type TemplateDocumentType = Extract<ExportPayload["documentType"], "sales" | "quote">

type TemplateDefinition = {
  path: string
  sha256: string
}

type ExportAdapterDependencies = {
  loadExcelJs?: () => Promise<typeof import("exceljs")>
  loadTemplate?: (
    documentType: TemplateDocumentType,
    options?: AdapterOperationOptions
  ) => Promise<ArrayBuffer>
}

const TEMPLATE_CACHE_PREFIX = "tradgio-export-templates-"
export const EXPORT_TEMPLATE_CACHE_NAME = `${TEMPLATE_CACHE_PREFIX}v1`

export const EXPORT_TEMPLATE_DEFINITIONS: Record<TemplateDocumentType, TemplateDefinition> = {
  sales: {
    path: "/templates/sales-order-template.xlsx",
    sha256: "597b8a8d9db7bfef2b989dabb855c1e026b2ad8a0c6c038f3ba4d1e91007494d",
  },
  quote: {
    path: "/templates/quote-template.xlsx",
    sha256: "f82082da0495626988564b133a4581bc6ea4622e28dc6c7481ed7c1942d0bcf3",
  },
}

export function resolveTemplatePath(
  templatePath: string,
  baseUrl = import.meta.env.BASE_URL
): string {
  const normalizedTemplatePath = templatePath.replace(/^\/+/, "")
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  const origin = globalThis.location?.origin ?? "http://localhost"
  return new URL(normalizedTemplatePath, new URL(normalizedBaseUrl, origin)).toString()
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted", "AbortError")
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function verifyTemplate(buffer: ArrayBuffer, expectedSha256: string): Promise<boolean> {
  if (!globalThis.crypto?.subtle) {
    throw new PlatformAdapterError("EXPORT_TEMPLATE_UNAVAILABLE", "浏览器无法校验导出模板")
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer)
  return bytesToHex(new Uint8Array(digest)) === expectedSha256
}

async function deleteStaleTemplateCaches(): Promise<void> {
  const cacheNames = await globalThis.caches.keys()
  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          cacheName.startsWith(TEMPLATE_CACHE_PREFIX) && cacheName !== EXPORT_TEMPLATE_CACHE_NAME
      )
      .map((cacheName) => globalThis.caches.delete(cacheName))
  )
}

export async function loadExportTemplate(
  documentType: TemplateDocumentType,
  options?: AdapterOperationOptions
): Promise<ArrayBuffer> {
  throwIfAborted(options?.signal)
  const definition = EXPORT_TEMPLATE_DEFINITIONS[documentType]
  const cache =
    typeof globalThis.caches !== "undefined"
      ? await globalThis.caches.open(EXPORT_TEMPLATE_CACHE_NAME)
      : null
  const templatePath = resolveTemplatePath(definition.path)
  const cachedResponse = await cache?.match(templatePath)

  if (cachedResponse) {
    const cachedBuffer = await cachedResponse.arrayBuffer()
    if (await verifyTemplate(cachedBuffer, definition.sha256)) {
      return cachedBuffer
    }
    await cache?.delete(templatePath)
  }

  let response: Response
  try {
    response = await fetch(templatePath, {
      cache: "no-cache",
      signal: options?.signal,
    })
  } catch (error) {
    if (cachedResponse) {
      throw new PlatformAdapterError(
        "EXPORT_TEMPLATE_VERSION_MISMATCH",
        "离线模板版本与当前应用不匹配，请联网更新后重试",
        error
      )
    }
    throw new PlatformAdapterError(
      "EXPORT_TEMPLATE_UNAVAILABLE",
      "导出模板尚未缓存，请联网后重试",
      error
    )
  }

  if (!response.ok) {
    throw new PlatformAdapterError(
      "EXPORT_TEMPLATE_UNAVAILABLE",
      `导出模板读取失败（${response.status}）`
    )
  }

  const buffer = await response.arrayBuffer()
  if (!(await verifyTemplate(buffer, definition.sha256))) {
    throw new PlatformAdapterError(
      "EXPORT_TEMPLATE_VERSION_MISMATCH",
      "导出模板版本与当前应用不匹配，请刷新后重试"
    )
  }

  if (cache) {
    try {
      await cache.put(
        templatePath,
        new Response(buffer.slice(0), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "X-Tradgio-Template-Sha256": definition.sha256,
          },
        })
      )
      await deleteStaleTemplateCaches()
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        throw new PlatformAdapterError(
          "QUOTA_EXCEEDED",
          "浏览器存储空间不足，无法缓存导出模板",
          error
        )
      }
      throw new PlatformAdapterError(
        "EXPORT_TEMPLATE_UNAVAILABLE",
        "导出模板缓存失败，请检查浏览器存储设置",
        error
      )
    }
  }

  return buffer
}

function setCellValue(
  worksheet: ExcelJS.Worksheet,
  cellAddress: string,
  value: string | number | null | undefined
): void {
  worksheet.getCell(cellAddress).value = value ?? ""
}

function centerCell(cell: ExcelJS.Cell): void {
  cell.alignment = {
    ...cell.alignment,
    horizontal: "center",
    vertical: "middle",
  }
}

function disableWrapText(cell: ExcelJS.Cell): void {
  cell.alignment = {
    ...cell.alignment,
    wrapText: false,
  }
}

function setThinBorder(cell: ExcelJS.Cell): void {
  const border: Partial<ExcelJS.Border> = { style: "thin" }
  cell.border = { top: border, left: border, bottom: border, right: border }
}

function styleDataRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  rowCount: number,
  startColumn: number,
  endColumn: number,
  includeBorder = false,
  noWrap = false
): void {
  for (let rowNumber = startRow; rowNumber < startRow + rowCount; rowNumber++) {
    for (let column = startColumn; column <= endColumn; column++) {
      const cell = worksheet.getCell(rowNumber, column)
      centerCell(cell)
      if (noWrap) disableWrapText(cell)
      if (includeBorder) setThinBorder(cell)
    }
  }
}

function styleCurrencyCell(cell: ExcelJS.Cell, currency: "USD" | "RMB"): void {
  centerCell(cell)
  cell.numFmt = currency === "USD" ? "$#,##0.00" : "¥#,##0.00"
}

function cloneRowStyle(source: ExcelJS.Row, target: ExcelJS.Row): void {
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
): number {
  const requiredRows = Math.max(lineCount, templateRowCount)
  const extraRows = requiredRows - templateRowCount
  if (extraRows <= 0) return requiredRows

  worksheet.insertRows(
    nextRow,
    Array.from({ length: extraRows }, () => []),
    "i"
  )
  const sourceRow = worksheet.getRow(nextRow - 1)
  for (let index = 0; index < extraRows; index++) {
    cloneRowStyle(sourceRow, worksheet.getRow(nextRow + index))
  }
  return requiredRows
}

function unmergeIfExists(worksheet: ExcelJS.Worksheet, range: string): void {
  try {
    worksheet.unMergeCells(range)
  } catch {}
}

function isBlankExportValue(value: string | number | null | undefined): boolean {
  return value == null || String(value).trim() === ""
}

function hideEmptySalesOptionalColumns(
  worksheet: ExcelJS.Worksheet,
  lineItems: ExportPayload["lineItems"]
): void {
  const optionalColumns = [
    { column: 1, field: "productCode" },
    { column: 3, field: "spec" },
    { column: 4, field: "color" },
  ] as const

  for (const { column, field } of optionalColumns) {
    worksheet.getColumn(column).hidden = lineItems.every((item) => isBlankExportValue(item[field]))
  }
}

function fillSalesTemplate(workbook: ExcelJS.Workbook, payload: ExportPayload): void {
  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) throw new Error("出货单模板缺少工作表")

  const totalLabel = worksheet.getCell("F9").value
  const signerText = worksheet.getCell("A11").value
  const noteText = worksheet.getCell("A12").value
  unmergeIfExists(worksheet, "F9:G9")
  unmergeIfExists(worksheet, "A11:I11")
  unmergeIfExists(worksheet, "A12:I12")

  const customerOrderNo = payload.header.customerOrderNo ?? ""
  setCellValue(worksheet, "A4", `送货单  NO: ${customerOrderNo}`)
  setCellValue(
    worksheet,
    "A5",
    `收货单位：${payload.header.counterpartyName}     订单号：${customerOrderNo}     日期：${payload.header.date}`
  )

  const lineStartRow = 7
  const lineRows = ensureRows(worksheet, 2, 9, payload.lineItems.length)
  const totalRow = lineStartRow + lineRows

  for (let index = 0; index < lineRows; index++) {
    const rowNumber = lineStartRow + index
    const item = payload.lineItems[index]
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

  styleDataRange(worksheet, lineStartRow, lineRows, 1, 9, false, true)
  for (let rowNumber = lineStartRow; rowNumber < lineStartRow + lineRows; rowNumber++) {
    styleCurrencyCell(worksheet.getCell(`G${rowNumber}`), "RMB")
    styleCurrencyCell(worksheet.getCell(`H${rowNumber}`), "RMB")
  }

  worksheet.mergeCells(`F${totalRow}:G${totalRow}`)
  worksheet.getCell(`F${totalRow}`).value = totalLabel
  setCellValue(worksheet, `H${totalRow}`, payload.totals.totalAmount)
  styleCurrencyCell(worksheet.getCell(`H${totalRow}`), "RMB")

  const signerRow = totalRow + 2
  const noteRow = totalRow + 3
  worksheet.mergeCells(`A${signerRow}:I${signerRow}`)
  worksheet.getCell(`A${signerRow}`).value = signerText
  worksheet.mergeCells(`A${noteRow}:I${noteRow}`)
  worksheet.getCell(`A${noteRow}`).value = noteText

  hideEmptySalesOptionalColumns(worksheet, payload.lineItems)
}

function fillQuoteTemplate(workbook: ExcelJS.Workbook, payload: ExportPayload): void {
  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) throw new Error("报价单模板缺少工作表")

  try {
    worksheet.unMergeCells("K10:K15")
  } catch {}

  setCellValue(
    worksheet,
    "A6",
    `TO: ${payload.header.counterpartyName}     日期：${payload.header.date}     编号：${payload.documentNo}`
  )

  const lineStartRow = 10
  const lineRows = ensureRows(worksheet, 6, 16, payload.lineItems.length)

  for (let index = 0; index < lineRows; index++) {
    const rowNumber = lineStartRow + index
    const item = payload.lineItems[index]
    setCellValue(worksheet, `A${rowNumber}`, item ? index + 1 : "")
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

function formatPayloadForPrint(payload: ExportPayload): string {
  const { header, lineItems, totals } = payload
  return [
    `${header.counterpartyLabel}: ${header.counterpartyName}`,
    `日期: ${header.date}`,
    `编号: ${header.documentNo}`,
    header.remark ? `备注: ${header.remark}` : "",
    "",
    "──────────────────────────────",
    "货品名称\t规格\t单位\t数量\t单价\t金额",
    ...lineItems.map(
      (item) =>
        `${item.productName}\t${item.spec || "-"}\t${item.unit || "-"}\t${item.quantity}\t¥${item.unitPrice.toFixed(2)}\t¥${item.lineAmount.toFixed(2)}`
    ),
    "──────────────────────────────",
    `合计: ${totals.lineCount} 种货品, ¥${totals.totalAmount.toFixed(2)}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function mapExportError(error: unknown): PlatformAdapterError {
  if (error instanceof PlatformAdapterError) return error
  if (error instanceof RangeError) {
    return new PlatformAdapterError(
      "EXPORT_MEMORY_EXHAUSTED",
      "可用内存不足，无法生成导出文件",
      error
    )
  }
  if (error instanceof TypeError) {
    return new PlatformAdapterError(
      "EXPORT_TEMPLATE_UNAVAILABLE",
      "导出组件尚未缓存，请联网后重试",
      error
    )
  }
  return mapPlatformError(error, "export")
}

export function createLocalExportAdapter(
  dependencies: ExportAdapterDependencies = {}
): LocalExportAdapter {
  const loadExcelJs = dependencies.loadExcelJs ?? (() => import("exceljs"))
  const loadTemplate = dependencies.loadTemplate ?? loadExportTemplate

  return {
    async export(request: ExportRequest, options?: AdapterOperationOptions): Promise<Blob> {
      throwIfAborted(options?.signal)
      if (request.format === "print") {
        return new Blob([formatPayloadForPrint(request.payload)], {
          type: "text/plain;charset=utf-8",
        })
      }
      if (request.payload.documentType !== "sales" && request.payload.documentType !== "quote") {
        throw new PlatformAdapterError("EXPORT_TEMPLATE_UNAVAILABLE", "当前单据暂未配置模板 Excel")
      }

      try {
        const [excelJsModule, templateBuffer] = await Promise.all([
          loadExcelJs(),
          loadTemplate(request.payload.documentType, options),
        ])
        throwIfAborted(options?.signal)
        const workbook = new excelJsModule.Workbook()
        await workbook.xlsx.load(templateBuffer)

        if (request.payload.documentType === "sales") {
          fillSalesTemplate(workbook, request.payload)
        } else {
          fillQuoteTemplate(workbook, request.payload)
        }

        const buffer = await workbook.xlsx.writeBuffer()
        return new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      } catch (error) {
        throw mapExportError(error)
      }
    },
  }
}

export const localExportAdapter = createLocalExportAdapter()
