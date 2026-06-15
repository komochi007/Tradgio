import type { AuthService } from "../../modules/auth/domain/AuthService"
import type { Repository } from "../query"
import type { PersistenceTransaction } from "./indexeddbSchema"

/**
 * 持久化适配器类型定义
 *
 * 业务数据、合同附件 Blob 与整机加密备份均使用本地生产适配器。
 */

export type PersistenceConfig = {
  /** 当前使用的持久化模式 */
  mode: "localStorage" | "indexeddb"
  /** localStorage 键名前缀 */
  storagePrefix: string
}

export type AuthAdapter = AuthService

export type DataAdapter<T extends { id: string; accountId: string }> = Repository<T>

export type AttachmentMetadata = {
  id: string
  accountId: string
  contractId: string
  fileName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
  digest?: string
}

export type FileSaveInput = Omit<AttachmentMetadata, "accountId"> & {
  blob: Blob
}

export interface FileAdapter {
  save(input: FileSaveInput, transaction: PersistenceTransaction): Promise<AttachmentMetadata>
  getMetadata(attachmentId: string): Promise<AttachmentMetadata | undefined>
  download(attachmentId: string): Promise<Blob>
  remove(attachmentId: string, transaction: PersistenceTransaction): Promise<void>
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
