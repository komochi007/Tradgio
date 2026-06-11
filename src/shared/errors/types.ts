export type AppErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "UNKNOWN"
  | "UPLOAD_ERROR"

export class AppError extends Error {
  code: AppErrorCode
  statusCode: number
  context?: Record<string, unknown>

  constructor(code: AppErrorCode, message: string, context?: Record<string, unknown>) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.context = context
    this.statusCode = errorCodeToStatus(code)
  }
}

function errorCodeToStatus(code: AppErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404
    case "VALIDATION_ERROR":
      return 400
    case "UNAUTHORIZED":
      return 401
    case "CONFLICT":
      return 409
    case "NETWORK_ERROR":
      return 0
    case "UPLOAD_ERROR":
      return 500
    default:
      return 500
  }
}
