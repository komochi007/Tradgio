import { INDEXED_DB_SCHEMA_VERSION } from "../persistence"

export type RuntimeEnvironment = "development" | "test" | "production"

export type RuntimeConfigInput = {
  environment: RuntimeEnvironment
  appVersion: string
  schemaVersion: number
  expectedOrigin?: string
  currentOrigin?: string
  serviceWorkerPath: string
}

export type RuntimeConfig = Readonly<RuntimeConfigInput>

export type RuntimeCompatibility =
  | { writable: true }
  | {
      writable: false
      reason:
        | "ORIGIN_MISMATCH"
        | "DATABASE_VERSION_MISSING"
        | "DATABASE_MIGRATION_REQUIRED"
        | "DATABASE_VERSION_TOO_NEW"
    }

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = Object.freeze({
  environment: "development",
  appVersion: "0.1.0",
  schemaVersion: INDEXED_DB_SCHEMA_VERSION,
  serviceWorkerPath: "/sw.js",
})

export function createRuntimeConfig(input: RuntimeConfigInput): RuntimeConfig {
  if (!input.appVersion.trim()) {
    throw new Error("应用版本不能为空")
  }
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1) {
    throw new Error("schema 版本必须为正整数")
  }
  if (!input.serviceWorkerPath.startsWith("/") || input.serviceWorkerPath.startsWith("//")) {
    throw new Error("Service Worker 路径必须是同源绝对路径")
  }
  if (input.environment === "production" && !input.expectedOrigin) {
    throw new Error("生产环境必须配置固定 HTTPS Origin")
  }
  if (input.environment === "production" && !input.currentOrigin) {
    throw new Error("生产环境必须提供当前 Origin 用于兼容检查")
  }
  if (input.expectedOrigin) {
    let parsedOrigin: URL
    try {
      parsedOrigin = new URL(input.expectedOrigin)
    } catch {
      throw new Error("正式 Origin 格式无效")
    }
    if (parsedOrigin.protocol !== "https:") {
      throw new Error("正式 Origin 必须使用 HTTPS")
    }
    if (parsedOrigin.origin !== input.expectedOrigin) {
      throw new Error("正式 Origin 不能包含路径、查询或片段")
    }
  }

  return Object.freeze({ ...input })
}

export function checkRuntimeCompatibility(
  config: RuntimeConfig,
  databaseVersion: number | null
): RuntimeCompatibility {
  if (
    config.expectedOrigin &&
    config.currentOrigin &&
    config.expectedOrigin !== config.currentOrigin
  ) {
    return { writable: false, reason: "ORIGIN_MISMATCH" }
  }
  if (databaseVersion === null) {
    return { writable: false, reason: "DATABASE_VERSION_MISSING" }
  }
  if (databaseVersion > config.schemaVersion) {
    return { writable: false, reason: "DATABASE_VERSION_TOO_NEW" }
  }
  if (databaseVersion < config.schemaVersion) {
    return { writable: false, reason: "DATABASE_MIGRATION_REQUIRED" }
  }
  return { writable: true }
}
