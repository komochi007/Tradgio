import {
  createIndexedDbRepository,
  generateNextDocumentNumber,
  indexedDbBusinessStores,
} from "../../../../shared"
import type { IndexedDbRepository } from "../../../../shared"
import type { QuoteOrder } from "../domain/types"

export const quoteRepository = createIndexedDbRepository<QuoteOrder>(
  indexedDbBusinessStores.quoteOrders,
  {
    uniqueConstraints: [{ field: "documentNo", label: "报价单编号" }],
  }
)

export async function generateDocumentNo(
  date = new Date(),
  repository: IndexedDbRepository<QuoteOrder> = quoteRepository
): Promise<string> {
  const all = await repository.getAll()
  return generateNextDocumentNumber(
    "quote",
    all.map((order) => order.documentNo),
    date
  )
}
