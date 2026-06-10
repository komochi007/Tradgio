import {
  createLocalStorageRepository,
  generateNextDocumentNumber,
} from "../../../../shared"
import type { PurchaseOrder } from "../domain/types"

export const purchaseRepository = createLocalStorageRepository<PurchaseOrder>(
  "tradgio_purchase_orders",
  { uniqueConstraints: [{ field: "documentNo", label: "进货单编号" }] }
)

export async function generateDocumentNo(date = new Date()): Promise<string> {
  const all = await purchaseRepository.getAll()
  return generateNextDocumentNumber(
    "purchase",
    all.map((order) => order.documentNo),
    date
  )
}
