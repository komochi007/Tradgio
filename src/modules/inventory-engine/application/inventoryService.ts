import { AppError, requireCurrentAccountId } from "../../../shared"
import type { IndexedDbRepository } from "../../../shared"
import type { InventoryLedger, CurrentStockSnapshot, InventoryOrderInput } from "../domain/types"
import {
  validateOrderInput,
  computeLedgerEntries,
  computeSnapshotUpdates,
  computeRecalcOrder,
  computeRecalcLedgerEntries,
} from "../domain/calculator"
import {
  ledgerRepository,
  snapshotRepository,
  getAllSnapshots,
  upsertSnapshots,
  getLedgerByProductId,
  removeLedgerByDocumentId,
} from "../infrastructure/inventoryRepository"

type InventoryRepositories = {
  ledger: IndexedDbRepository<InventoryLedger>
  snapshot: IndexedDbRepository<CurrentStockSnapshot>
}

const defaultRepositories: InventoryRepositories = {
  ledger: ledgerRepository,
  snapshot: snapshotRepository,
}

function sortByHappenedAt(a: InventoryLedger, b: InventoryLedger): number {
  return new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime()
}

function assertCurrentAccount(order: InventoryOrderInput): void {
  if (order.accountId !== requireCurrentAccountId()) {
    throw new AppError("UNAUTHORIZED", "库存单据不属于当前账号")
  }
}

export async function applyPurchaseOrder(
  order: InventoryOrderInput,
  repositories: InventoryRepositories = defaultRepositories
): Promise<InventoryLedger[]> {
  assertCurrentAccount(order)
  const error = validateOrderInput(order)
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message)
  }

  const currentSnapshots = await getAllSnapshots(repositories.snapshot)
  const entries = computeLedgerEntries(order, currentSnapshots)

  if (entries.length === 0) {
    throw new AppError("VALIDATION_ERROR", "无法生成库存流水")
  }

  for (const entry of entries) {
    await repositories.ledger.create(entry)
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots)
  await upsertSnapshots(snapshots, repositories.snapshot)

  return entries
}

export async function applySalesOrder(
  order: InventoryOrderInput,
  repositories: InventoryRepositories = defaultRepositories
): Promise<InventoryLedger[]> {
  assertCurrentAccount(order)
  const error = validateOrderInput(order)
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message)
  }

  const currentSnapshots = await getAllSnapshots(repositories.snapshot)
  const entries = computeLedgerEntries(order, currentSnapshots)

  if (entries.length === 0) {
    throw new AppError("VALIDATION_ERROR", "无法生成库存流水")
  }

  for (const entry of entries) {
    await repositories.ledger.create(entry)
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots)
  await upsertSnapshots(snapshots, repositories.snapshot)

  return entries
}

export async function recalculateOrderDelta(
  previousOrder: InventoryOrderInput,
  nextOrder: InventoryOrderInput,
  repositories: InventoryRepositories = defaultRepositories
): Promise<InventoryLedger[]> {
  assertCurrentAccount(previousOrder)
  assertCurrentAccount(nextOrder)
  const previousError = validateOrderInput(previousOrder)
  const nextError = validateOrderInput(nextOrder)
  if (previousError || nextError) {
    throw new AppError(
      "VALIDATION_ERROR",
      previousError?.message ?? nextError?.message ?? "单据数据非法"
    )
  }

  const deltaOrder = computeRecalcOrder(previousOrder, nextOrder)

  if (!deltaOrder) {
    return []
  }

  const currentSnapshots = await getAllSnapshots(repositories.snapshot)
  const entries = computeRecalcLedgerEntries(deltaOrder, currentSnapshots)

  if (entries.length === 0) {
    return []
  }

  for (const entry of entries) {
    await repositories.ledger.create(entry)
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots)
  await upsertSnapshots(snapshots, repositories.snapshot)

  return entries
}

export async function getCurrentStock(productId: string): Promise<number> {
  const snapshots = await getAllSnapshots()
  return snapshots.get(productId) ?? 0
}

export async function getStockSnapshot(): Promise<CurrentStockSnapshot[]> {
  const accountId = requireCurrentAccountId()
  const snapshots = await getAllSnapshots()
  const now = new Date().toISOString()
  const result: CurrentStockSnapshot[] = []
  for (const [productId, quantity] of snapshots) {
    result.push({
      id: productId,
      accountId,
      productId,
      quantity,
      updatedAt: now,
    })
  }
  return result
}

export async function getStockHistory(productId: string): Promise<InventoryLedger[]> {
  const entries = await getLedgerByProductId(productId)
  return entries.sort(sortByHappenedAt)
}

export async function getStockAlerts(
  lines: Array<{ productId: string; quantity: number }>
): Promise<Array<{ productId: string; currentStock: number; shortage: number }>> {
  const snapshots = await getAllSnapshots()
  const alerts: Array<{ productId: string; currentStock: number; shortage: number }> = []

  for (const line of lines) {
    const currentStock = snapshots.get(line.productId) ?? 0
    const shortage = line.quantity - currentStock
    if (shortage > 0) {
      alerts.push({
        productId: line.productId,
        currentStock,
        shortage,
      })
    }
  }

  return alerts
}

export async function removeDocumentLedger(documentId: string): Promise<void> {
  await removeLedgerByDocumentId(documentId)
}
