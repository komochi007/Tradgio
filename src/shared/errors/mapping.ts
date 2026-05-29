import { AppError } from "./types"

export function mapError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error instanceof Error) {
    return new AppError("UNKNOWN", error.message)
  }

  return new AppError("UNKNOWN", "发生未知错误")
}

export function getUserFacingMessage(error: AppError): string {
  switch (error.code) {
    case "NOT_FOUND":
      return "未找到相关数据"
    case "VALIDATION_ERROR":
      return error.message
    case "UNAUTHORIZED":
      return "登录已失效，请重新登录"
    case "CONFLICT":
      return "数据冲突，请刷新后重试"
    case "NETWORK_ERROR":
      return "网络连接失败，请检查网络后重试"
    default:
      return "操作失败，请稍后重试"
  }
}
