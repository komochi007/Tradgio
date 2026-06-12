import {
  createIndexedDbRepository,
  generateNextDocumentNumber,
  indexedDbBusinessStores,
} from "../../../shared"
import type { IndexedDbRepository } from "../../../shared"
import type { ContractRecord } from "../domain/types"

export const contractRepository = createIndexedDbRepository<ContractRecord>(
  indexedDbBusinessStores.contracts,
  { uniqueConstraints: [{ field: "contractNo", label: "合同编号" }] }
)

export async function generateDocumentNo(
  date = new Date(),
  repository: IndexedDbRepository<ContractRecord> = contractRepository
): Promise<string> {
  const all = await repository.getAll()
  return generateNextDocumentNumber(
    "contract",
    all.map((record) => record.contractNo),
    date
  )
}
