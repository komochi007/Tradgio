import { createLocalStorageRepository } from "../../../../shared"
import type { QuoteOrder } from "../domain/types"

export const quoteRepository = createLocalStorageRepository<QuoteOrder>(
  "tradgio_quote_orders"
)

export async function generateDocumentNo(): Promise<string> {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const all = await quoteRepository.getAll()
  const thisMonth = all.filter((o) => o.documentNo.startsWith(`BJ${ym}`))
  const seq = String(thisMonth.length + 1).padStart(3, "0")
  return `BJ${ym}${seq}`
}
