import { AppError } from "../../../shared";
import type {
  InventoryLedger,
  CurrentStockSnapshot,
  InventoryOrderInput,
} from "../domain/types";
import {
  validateOrderInput,
  computeLedgerEntries,
  computeSnapshotUpdates,
  computeRecalcOrder,
} from "../domain/calculator";
import {
  ledgerRepository,
  getAllSnapshots,
  upsertSnapshots,
  getLedgerByProductId,
  removeLedgerByDocumentId,
} from "../infrastructure/inventoryRepository";

function sortByHappenedAt(a: InventoryLedger, b: InventoryLedger): number {
  return new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime();
}

export async function applyPurchaseOrder(
  order: InventoryOrderInput
): Promise<InventoryLedger[]> {
  const error = validateOrderInput(order);
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }

  const currentSnapshots = await getAllSnapshots();
  const entries = computeLedgerEntries(order, currentSnapshots);

  if (entries.length === 0) {
    throw new AppError("VALIDATION_ERROR", "无法生成库存流水");
  }

  for (const entry of entries) {
    await ledgerRepository.create(entry);
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots);
  await upsertSnapshots(snapshots);

  return entries;
}

export async function applySalesOrder(
  order: InventoryOrderInput
): Promise<InventoryLedger[]> {
  const error = validateOrderInput(order);
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }

  const currentSnapshots = await getAllSnapshots();
  const entries = computeLedgerEntries(order, currentSnapshots);

  if (entries.length === 0) {
    throw new AppError("VALIDATION_ERROR", "无法生成库存流水");
  }

  for (const entry of entries) {
    await ledgerRepository.create(entry);
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots);
  await upsertSnapshots(snapshots);

  return entries;
}

export async function recalculateOrderDelta(
  previousOrder: InventoryOrderInput,
  nextOrder: InventoryOrderInput
): Promise<InventoryLedger[]> {
  const deltaOrder = computeRecalcOrder(previousOrder, nextOrder);

  if (!deltaOrder) {
    return [];
  }

  const error = validateOrderInput(deltaOrder);
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }

  const currentSnapshots = await getAllSnapshots();
  const entries = computeLedgerEntries(deltaOrder, currentSnapshots);

  if (entries.length === 0) {
    return [];
  }

  for (const entry of entries) {
    await ledgerRepository.create(entry);
  }

  const snapshots = computeSnapshotUpdates(entries, currentSnapshots);
  await upsertSnapshots(snapshots);

  return entries;
}

export async function getCurrentStock(
  productId: string
): Promise<number> {
  const snapshots = await getAllSnapshots();
  return snapshots.get(productId) ?? 0;
}

export async function getStockSnapshot(): Promise<CurrentStockSnapshot[]> {
  const snapshots = await getAllSnapshots();
  const now = new Date().toISOString();
  const result: CurrentStockSnapshot[] = [];
  for (const [productId, quantity] of snapshots) {
    result.push({
      id: productId,
      productId,
      quantity,
      updatedAt: now,
    });
  }
  return result;
}

export async function getStockHistory(
  productId: string
): Promise<InventoryLedger[]> {
  const entries = await getLedgerByProductId(productId);
  return entries.sort(sortByHappenedAt);
}

export async function getStockAlerts(
  lines: Array<{ productId: string; quantity: number }>
): Promise<Array<{ productId: string; currentStock: number; shortage: number }>> {
  const snapshots = await getAllSnapshots();
  const alerts: Array<{ productId: string; currentStock: number; shortage: number }> = [];

  for (const line of lines) {
    const currentStock = snapshots.get(line.productId) ?? 0;
    const shortage = line.quantity - currentStock;
    if (shortage > 0) {
      alerts.push({
        productId: line.productId,
        currentStock,
        shortage,
      });
    }
  }

  return alerts;
}

export async function removeDocumentLedger(
  documentId: string
): Promise<void> {
  await removeLedgerByDocumentId(documentId);
}
