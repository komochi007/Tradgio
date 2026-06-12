import { createIndexedDbRepository, indexedDbBusinessStores } from "../../../shared"
import type { IndexedDbRepository } from "../../../shared"
import type { InventoryLedger, CurrentStockSnapshot } from "../domain/types"

export const ledgerRepository = createIndexedDbRepository<InventoryLedger>(
  indexedDbBusinessStores.inventoryLedger
)

export const snapshotRepository = createIndexedDbRepository<CurrentStockSnapshot>(
  indexedDbBusinessStores.inventorySnapshots
)

export async function getAllSnapshots(
  repository: IndexedDbRepository<CurrentStockSnapshot> = snapshotRepository
): Promise<Map<string, number>> {
  const snapshots = await repository.getAll()
  const map = new Map<string, number>()
  for (const s of snapshots) {
    map.set(s.productId, s.quantity)
  }
  return map
}

export async function upsertSnapshots(
  snapshots: CurrentStockSnapshot[],
  repository: IndexedDbRepository<CurrentStockSnapshot> = snapshotRepository
): Promise<void> {
  for (const snapshot of snapshots) {
    const existing = await repository.getById(snapshot.id)
    if (existing) {
      await repository.update(snapshot.id, snapshot)
    } else {
      await repository.create(snapshot)
    }
  }
}

export async function getLedgerByProductId(
  productId: string,
  repository: IndexedDbRepository<InventoryLedger> = ledgerRepository
): Promise<InventoryLedger[]> {
  return repository.query((entry) => entry.productId === productId)
}

export async function getLedgerByDocumentId(
  documentId: string,
  repository: IndexedDbRepository<InventoryLedger> = ledgerRepository
): Promise<InventoryLedger[]> {
  return repository.query((entry) => entry.documentId === documentId)
}

export async function removeLedgerByDocumentId(documentId: string): Promise<void> {
  const entries = await getLedgerByDocumentId(documentId)
  for (const entry of entries) {
    await ledgerRepository.remove(entry.id)
  }
}
