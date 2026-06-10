import type { AuthService } from "../../modules/auth/domain/AuthService"
import type { Repository } from "../query"

/**
 * 持久化适配器类型定义
 *
 * 当前全部使用 localStorage 实现，未来可按接口替换为托管后端：
 *   - AuthAdapter      → Managed Auth（Clerk / Auth0 / 自建）
 *   - DataAdapter      → PostgreSQL + API
 *   - FileAdapter      → Object Storage（S3 / R2）
 *   - ExportAdapter    → Serverless Export Function
 */

export type PersistenceConfig = {
  /** 当前使用的持久化模式 */
  mode: "local" | "remote"
  /** localStorage 键名前缀 */
  storagePrefix: string
}

export type AuthAdapter = AuthService

export type DataAdapter<T extends { id: string; accountId: string }> = Repository<T>

export interface FileAdapter {
  upload(file: File, metadata: Record<string, string>): Promise<{ url: string; key: string }>
  download(key: string): Promise<Blob>
  remove(key: string): Promise<void>
}

export interface ExportAdapter {
  exportPrint(payload: unknown): Promise<Blob>
  exportSheet(payload: unknown): Promise<Blob>
}

/**
 * 当前本地适配器注册表结构
 */
export type PersistenceRegistry = {
  config: PersistenceConfig
  auth: AuthAdapter
  data: Record<string, DataAdapter<any>>
  file: FileAdapter | null
  export: ExportAdapter | null
}
