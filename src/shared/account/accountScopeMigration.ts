const MIGRATION_KEY = "tradgio_migration_account_scope_v1"

export const ACCOUNT_SCOPED_STORAGE_KEYS = [
  "tradgio_products",
  "tradgio_counterparties",
  "tradgio_purchase_orders",
  "tradgio_sales_orders",
  "tradgio_quote_orders",
  "tradgio_contracts",
  "tradgio_inventory_ledger",
  "tradgio_inventory_snapshots",
] as const

type MigrationMarker = {
  version: 1
  accountId: string
  migratedAt: string
}

export function migrateLegacyBusinessData(accountId: string): void {
  const existingMarker = localStorage.getItem(MIGRATION_KEY)
  if (existingMarker) return

  for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue

    let records: unknown[]
    try {
      records = JSON.parse(raw)
    } catch {
      continue
    }

    if (!Array.isArray(records)) continue

    const migrated = records.map((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        return record
      }
      const item = record as Record<string, unknown>
      return item.accountId ? item : { ...item, accountId }
    })
    localStorage.setItem(key, JSON.stringify(migrated))
  }

  const marker: MigrationMarker = {
    version: 1,
    accountId,
    migratedAt: new Date().toISOString(),
  }
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(marker))
}

export function getAccountScopeMigrationKey(): string {
  return MIGRATION_KEY
}
