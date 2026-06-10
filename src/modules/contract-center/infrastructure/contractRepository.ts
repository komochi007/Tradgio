import {
  createLocalStorageRepository,
  generateNextDocumentNumber,
} from "../../../shared"
import type { ContractRecord } from "../domain/types"

export const contractRepository = createLocalStorageRepository<ContractRecord>(
  "tradgio_contracts",
  { uniqueConstraints: [{ field: "contractNo", label: "合同编号" }] }
)

export async function generateDocumentNo(date = new Date()): Promise<string> {
  const all = await contractRepository.getAll()
  return generateNextDocumentNumber(
    "contract",
    all.map((record) => record.contractNo),
    date
  )
}
