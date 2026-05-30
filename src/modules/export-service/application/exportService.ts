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
  return format === "print" ? "打印版" : "表格版"
}

export async function exportDocument(
  payload: ExportPayload,
  format: ExportFormat
): Promise<ExportResult> {
  const formatSuffix = getFormatSuffix(format)
  const baseFilename = `${payload.documentNo}${format === "print" ? "" : "-表格版"}`

  try {
    await delay(600)

    if (format === "print") {
      const content = formatPayloadForPrint(payload)

      if (typeof window !== "undefined") {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${baseFilename}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } else {
      if (typeof window !== "undefined") {
        const rows = [
          ["货品名称", "规格", "单位", "数量", "单价", "金额"],
          ...payload.lineItems.map((l) => [
            l.productName,
            l.spec || "-",
            l.unit || "-",
            String(l.quantity),
            `¥${l.unitPrice.toFixed(2)}`,
            `¥${l.lineAmount.toFixed(2)}`,
          ]),
        ]
        const csvContent = rows.map((r) => r.join(",")).join("\n")
        const bom = "\uFEFF"
        const blob = new Blob([bom + csvContent], {
          type: "text/csv;charset=utf-8",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${baseFilename}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
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
