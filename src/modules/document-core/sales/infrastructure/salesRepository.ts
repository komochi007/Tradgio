import {
  createLocalStorageRepository,
  generateNextDocumentNumber,
} from "../../../../shared"
import type { SalesOrder } from "../domain/types"

export const salesRepository = createLocalStorageRepository<SalesOrder>(
  "tradgio_sales_orders",
  { uniqueConstraints: [{ field: "documentNo", label: "出货单编号" }] }
)

export async function generateDocumentNo(date = new Date()): Promise<string> {
  const all = await salesRepository.getAll()
  return generateNextDocumentNumber(
    "sales",
    all.map((order) => order.documentNo),
    date
  )
}
