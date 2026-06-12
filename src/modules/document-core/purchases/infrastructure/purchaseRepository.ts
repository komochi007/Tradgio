import {
  createIndexedDbRepository,
  generateNextDocumentNumber,
  indexedDbBusinessStores,
} from "../../../../shared"
import type { IndexedDbRepository } from "../../../../shared"
import type { PurchaseOrder } from "../domain/types"

export const purchaseRepository = createIndexedDbRepository<PurchaseOrder>(
  indexedDbBusinessStores.purchaseOrders,
  { uniqueConstraints: [{ field: "documentNo", label: "进货单编号" }] }
)

export async function generateDocumentNo(
  date = new Date(),
  repository: IndexedDbRepository<PurchaseOrder> = purchaseRepository
): Promise<string> {
  const all = await repository.getAll()
  return generateNextDocumentNumber(
    "purchase",
    all.map((order) => order.documentNo),
    date
  )
}
