import {
  createIndexedDbRepository,
  generateNextDocumentNumber,
  indexedDbBusinessStores,
} from "../../../../shared"
import type { IndexedDbRepository } from "../../../../shared"
import type { SalesOrder } from "../domain/types"

export const salesRepository = createIndexedDbRepository<SalesOrder>(
  indexedDbBusinessStores.salesOrders,
  {
    uniqueConstraints: [{ field: "documentNo", label: "出货单编号" }],
  }
)

export async function generateDocumentNo(
  date = new Date(),
  repository: IndexedDbRepository<SalesOrder> = salesRepository
): Promise<string> {
  const all = await repository.getAll()
  return generateNextDocumentNumber(
    "sales",
    all.map((order) => order.documentNo),
    date
  )
}
