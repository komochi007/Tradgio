import type { PersistenceConfig } from "./types"

/**
 * 本地持久化统一配置
 *
 * 所有 localStorage 键名集中在此注册，任务 38-40 将按 ADR-0002
 * 逐步替换为 Local Auth、IndexedDB Repository 和 IndexedDB File Adapter。
 */

export const persistenceConfig: PersistenceConfig = {
  mode: "localStorage",
  storagePrefix: "tradgio",
}

/**
 * localStorage 键名映射表
 *
 * 对应关系：
 *   auth          → tradgio_accounts / tradgio_passwords / tradgio_session
 *   products      → tradgio_products
 *   counterparties → tradgio_counterparties
 *   purchases     → tradgio_purchase_orders
 *   sales         → tradgio_sales_orders
 *   quotes        → tradgio_quote_orders
 *   contracts     → tradgio_contracts
 *   inventory     → tradgio_inventory_ledger / tradgio_inventory_snapshots
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
    purchases: "tradgio_purchase_orders",
    sales: "tradgio_sales_orders",
    quotes: "tradgio_quote_orders",
    contracts: "tradgio_contracts",
    inventoryLedger: "tradgio_inventory_ledger",
    inventorySnapshot: "tradgio_inventory_snapshots",
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
    "tradgio_migration_account_scope_v1",
  ]
}

/**
 * IndexedDB 本地优先迁移适配点清单
 *
 * ┌──────────────┬─────────────────────┬──────────────────────────────┐
 * │ 适配层        │ 当前实现             │ 未来替换方向                   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ AuthAdapter  │ localStorage        │ IndexedDB + Web Crypto        │
 * │              │ (localStorageAuth)  │ 保持 AuthService 接口不变      │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ DataAdapter  │ localStorage        │ IndexedDB Repository          │
 * │              │ (createRepo<T>)     │ Repository<T> 接口不变        │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ FileAdapter  │ dataUrl (base64)    │ IndexedDB Blob store          │
 * │              │ (内嵌在 Contract)    │ FileAdapter save/read/remove  │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ ExportAdapter│ 客户端 Blob 下载      │ 离线客户端按需加载              │
 * │              │ (exportService.ts)  │ 保持 Export Service 接口不变   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ BackupAdapter│ 尚未实现             │ 全库加密备份、预览与恢复         │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ StorageAdapter│ 尚未实现            │ Storage API 容量与持久化         │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ PwaUpdateAdapter│ 尚未实现          │ waiting 更新提示与显式激活       │
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
    future: "替换为 IndexedDB + Web Crypto 实现，保持 AuthService 接口不变",
  },
  data: {
    current: "src/shared/query/localStorageAdapter.ts",
    future: "替换为 IndexedDB Repository，保持 Repository<T> 接口不变",
  },
  file: {
    current: "ContractAttachment.dataUrl (内嵌在合同中)",
    future: "实现 IndexedDB File Adapter，分离附件元数据与 Blob",
  },
  export: {
    current: "src/modules/export-service/application/exportService.ts",
    future: "保持客户端导出，按需加载 ExcelJS 和离线模板",
  },
  backup: {
    current: "尚未实现",
    future: "按 specs/backup-restore.md 实现整机加密备份与恢复",
  },
  storage: {
    current: "尚未实现",
    future: "封装 Storage API 容量查询、持久化与阈值策略",
  },
  pwaUpdate: {
    current: "尚未实现",
    future: "封装 Service Worker 注册、检查、waiting 提示与显式激活",
  },
}
