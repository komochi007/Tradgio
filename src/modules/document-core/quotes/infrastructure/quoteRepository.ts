import {
  createLocalStorageRepository,
  generateNextDocumentNumber,
} from "../../../../shared"
import type { QuoteOrder } from "../domain/types"

export const quoteRepository = createLocalStorageRepository<QuoteOrder>(
  "tradgio_quote_orders",
  { uniqueConstraints: [{ field: "documentNo", label: "报价单编号" }] }
)

export async function generateDocumentNo(date = new Date()): Promise<string> {
  const all = await quoteRepository.getAll()
  return generateNextDocumentNumber(
    "quote",
    all.map((order) => order.documentNo),
    date
  )
}
