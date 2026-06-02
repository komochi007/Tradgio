import { createLocalStorageRepository } from "../../../../shared"
import type { PurchaseOrder } from "../domain/types"

export const purchaseRepository = createLocalStorageRepository<PurchaseOrder>(
  "tradgio_purchase_orders"
)

export async function generateDocumentNo(): Promise<string> {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const all = await purchaseRepository.getAll()
  const thisMonth = all.filter((o) => o.documentNo.startsWith(`JH${ym}`))
  const seq = String(thisMonth.length + 1).padStart(2, "0")
  return `JH${ym}${seq}`
}
