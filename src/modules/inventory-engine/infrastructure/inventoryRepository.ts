import { createLocalStorageRepository } from "../../../shared"
import type { InventoryLedger, CurrentStockSnapshot } from "../domain/types"

export const ledgerRepository = createLocalStorageRepository<InventoryLedger>(
  "tradgio_inventory_ledger"
)

export const snapshotRepository = createLocalStorageRepository<CurrentStockSnapshot>(
  "tradgio_inventory_snapshots"
)

export async function getAllSnapshots(): Promise<Map<string, number>> {
  const snapshots = await snapshotRepository.getAll()
  const map = new Map<string, number>()
  for (const s of snapshots) {
    map.set(s.productId, s.quantity)
  }
  return map
}

export async function upsertSnapshots(snapshots: CurrentStockSnapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    const existing = await snapshotRepository.getById(snapshot.id)
    if (existing) {
      await snapshotRepository.update(snapshot.id, snapshot)
    } else {
      await snapshotRepository.create(snapshot)
    }
  }
}

export async function getLedgerByProductId(productId: string): Promise<InventoryLedger[]> {
  return ledgerRepository.query((entry) => entry.productId === productId)
}

export async function getLedgerByDocumentId(documentId: string): Promise<InventoryLedger[]> {
  return ledgerRepository.query((entry) => entry.documentId === documentId)
}

export async function removeLedgerByDocumentId(documentId: string): Promise<void> {
  const entries = await getLedgerByDocumentId(documentId)
  for (const entry of entries) {
    await ledgerRepository.remove(entry.id)
  }
}
