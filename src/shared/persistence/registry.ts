import type { PersistenceConfig } from "./types"

/**
 * 本地持久化统一配置
 *
 * 业务数据已使用 IndexedDB，localStorage 键仅用于认证会话和旧数据迁移。
 */

export const persistenceConfig: PersistenceConfig = {
  mode: "indexeddb",
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
 * │ AuthAdapter  │ IndexedDB           │ 已完成 Web Crypto 安全改造      │
 * │              │ + Web Crypto       │ 保持 AuthService 接口不变      │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ DataAdapter  │ IndexedDB          │ 已完成业务数据与草稿迁移       │
 * │              │ Repository         │ 保持 Repository<T> 接口不变   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ FileAdapter  │ IndexedDB Blob     │ 已完成 save/read/remove       │
 * │              │ + 独立元数据        │ 合同仅保留 attachmentId       │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ ExportAdapter│ 客户端 Blob 下载      │ 离线客户端按需加载              │
 * │              │ (exportService.ts)  │ 保持 Export Service 接口不变   │
 * ├──────────────┼─────────────────────┼──────────────────────────────┤
 * │ BackupAdapter│ Backup Service      │ 全库加密备份、预览与恢复         │
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
    current: "src/modules/auth/infrastructure/indexedDbAuthAdapter.ts",
    future: "保持 IndexedDB + Web Crypto 实现和 AuthService 接口稳定",
  },
  data: {
    current: "src/shared/query/indexedDbAdapter.ts",
    future: "保持 IndexedDB Repository 和账号隔离事务边界稳定",
  },
  file: {
    current: "src/modules/contract-center/infrastructure/indexedDbFileAdapter.ts",
    future: "保持附件元数据、Blob 和合同事务边界稳定",
  },
  export: {
    current: "src/modules/export-service/application/exportService.ts",
    future: "保持客户端导出，按需加载 ExcelJS 和离线模板",
  },
  backup: {
    current: "src/modules/backup/application/backupService.ts",
    future: "保持 .tradgio-backup v1、恢复预览和整库替换边界稳定",
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
