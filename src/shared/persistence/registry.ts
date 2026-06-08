import type { PersistenceConfig } from "./types"

/**
 * 本地持久化统一配置
 *
 * 所有 localStorage 键名集中在此注册，未来迁移远程后端时：
 *   1. 将 mode 改为 "remote"
 *   2. 替换 data 中每个 key 对应的适配器实现
 *   3. 替换 auth 为托管 Auth SDK 调用
 */

export const persistenceConfig: PersistenceConfig = {
  mode: "local",
  storagePrefix: "tradgio",
}

/**
 * localStorage 键名映射表
 *
 * 对应关系：
 *   auth          → tradgio_accounts / tradgio_passwords / tradgio_session
 *   products      → tradgio_products
 *   counterparties → tradgio_counterparties
 *   purchases     → tradgio_purchases
 *   sales         → tradgio_sales
 *   quotes        → tradgio_quotes
 *   contracts     → tradgio_contracts
 *   inventory     → tradgio_inventory_ledger / tradgio_inventory_snapshot
 *   drafts        → tradgio_drafts
 */
export const STORAGE_KEYS = {
  auth: {
    accounts: "tradgio_accounts",
    passwords: "tradgio_passwords",
    session: "tradgio_session",
  },
  data: {
    products: "tradgio_products",
    counterparties: "tradgio_counterparties",
    purchases: "tradgio_purchases",
    sales: "tradgio_sales",
    quotes: "tradgio_quotes",
    contracts: "tradgio_contracts",
    inventoryLedger: "tradgio_inventory_ledger",
    inventorySnapshot: "tradgio_inventory_snapshot",
  },
  drafts: "tradgio_drafts",
} as const

/**
 * 获取所有 localStorage 数据键名（用于调试/迁移）
 */
export function getAllStorageKeys(): string[] {
  return [
    STORAGE_KEYS.auth.accounts,
    STORAGE_KEYS.auth.passwords,
    STORAGE_KEYS.auth.session,
    ...Object.values(STORAGE_KEYS.data),
    STORAGE_KEYS.drafts,
  ]
}

/**
 * 未来后端迁移适配点清单
 *
 * ┌──────────────┬─────────────────────┬──────────────────────────────┐
 * │ 适配层        │ 当前实现             │ 未来替换方向                   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ AuthAdapter  │ localStorage        │ Clerk / Auth0 / 自建 OAuth    │
 * │              │ (localStorageAuth)  │ authService.register/login    │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ DataAdapter  │ localStorage        │ PostgreSQL + Prisma/Drizzle   │
 * │              │ (createRepo<T>)     │ Repository<T> 接口不变        │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ FileAdapter  │ dataUrl (base64)    │ S3 / Cloudflare R2            │
 * │              │ (内嵌在 Contract)    │ FileAdapter.upload/download   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ ExportAdapter│ 客户端 Blob 下载      │ Serverless Function           │
 * │              │ (exportService.ts)  │ ExportAdapter.export*()       │
 * └──────────────┴─────────────────────┴──────────────────────────────┘
 *
 * 迁移原则：
 *   - 页面层和领域层代码不需要改动
 *   - 仅替换 infrastructure 层的适配器实现
 *   - Repository<T> 接口已定义，新适配器只需实现相同接口
 *   - AuthService 接口已定义，新适配器只需实现相同接口
 */
export const MIGRATION_POINTS = {
  auth: {
    current: "src/modules/auth/infrastructure/localStorageAuthAdapter.ts",
    future: "替换为 Managed Auth SDK 调用，保持 AuthService 接口不变",
  },
  data: {
    current: "src/shared/query/localStorageAdapter.ts",
    future: "替换为 REST API 或 ORM 调用，保持 Repository<T> 接口不变",
  },
  file: {
    current: "ContractAttachment.dataUrl (内嵌在合同中)",
    future: "实现 FileAdapter 接口，上传至 Object Storage，记录 URL/key",
  },
  export: {
    current: "src/modules/export-service/application/exportService.ts",
    future: "实现 ExportAdapter 接口，调用 Serverless 函数生成并返回文件",
  },
}
