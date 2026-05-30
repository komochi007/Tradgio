import { createLocalStorageRepository } from "../../../../shared"
import type { SalesOrder } from "../domain/types"

export const salesRepository = createLocalStorageRepository<SalesOrder>(
  "tradgio_sales_orders"
)

export async function generateDocumentNo(): Promise<string> {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const all = await salesRepository.getAll()
  const thisMonth = all.filter((o) => o.documentNo.startsWith(`CH${ym}`))
  const seq = String(thisMonth.length + 1).padStart(3, "0")
  return `CH${ym}${seq}`
}
