import { PlatformAdapterError } from "../../../shared/platform"
import { localExportAdapter } from "../infrastructure/localExportAdapter"
import type { ExportFormat, ExportPayload, ExportResult } from "../domain/types"

function getFormatSuffix(format: ExportFormat): string {
  return format === "print" ? "打印版" : "模板Excel"
}

function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw new PlatformAdapterError("EXPORT_DOWNLOAD_FAILED", "浏览器下载失败，请重试", error)
  }
}

export async function exportDocument(
  payload: ExportPayload,
  format: ExportFormat
): Promise<ExportResult> {
  const formatSuffix = getFormatSuffix(format)
  const baseFilename = `${payload.documentNo}${format === "print" ? "" : "-模板Excel"}`
  const filename = `${baseFilename}.${format === "print" ? "txt" : "xlsx"}`

  try {
    const blob = await localExportAdapter.export({ payload, format })
    if (typeof window !== "undefined") {
      downloadBlob(blob, filename)
    }
    return {
      success: true,
      message: `${formatSuffix}导出成功`,
      format,
      filename: baseFilename,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${formatSuffix}导出失败，请重试`
    return {
      success: false,
      message: `导出失败: ${message}`,
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
