import type { PlatformErrorCode } from "./types"

export class PlatformAdapterError extends Error {
  readonly code: PlatformErrorCode
  readonly cause?: unknown

  constructor(code: PlatformErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = "PlatformAdapterError"
    this.code = code
    this.cause = cause
  }
}

export type PlatformOperation =
  | "database-open"
  | "database-write"
  | "storage"
  | "crypto"
  | "backup"
  | "export"
  | "update"

export function mapPlatformError(
  error: unknown,
  operation: PlatformOperation
): PlatformAdapterError {
  if (error instanceof PlatformAdapterError) return error

  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      return new PlatformAdapterError("OPERATION_ABORTED", "操作已取消", error)
    }
    if (error.name === "QuotaExceededError") {
      return new PlatformAdapterError("QUOTA_EXCEEDED", "本地存储空间不足", error)
    }
    if (error.name === "VersionError") {
      return new PlatformAdapterError(
        "DATABASE_VERSION_TOO_NEW",
        "数据库版本高于当前应用支持版本",
        error
      )
    }
    if (operation === "crypto" || operation === "backup") {
      return new PlatformAdapterError(
        "BACKUP_PASSWORD_OR_INTEGRITY_FAILED",
        "备份密码错误或文件已损坏",
        error
      )
    }
  }

  const fallback: Record<PlatformOperation, PlatformErrorCode> = {
    "database-open": "STORAGE_UNAVAILABLE",
    "database-write": "TRANSACTION_ABORTED",
    storage: "STORAGE_UNAVAILABLE",
    crypto: "CRYPTO_UNAVAILABLE",
    backup: "BACKUP_INVALID",
    export: "EXPORT_GENERATION_FAILED",
    update: "UPDATE_UNAVAILABLE",
  }
  return new PlatformAdapterError(fallback[operation], "本地平台操作失败", error)
}
