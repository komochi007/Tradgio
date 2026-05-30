import { createLocalStorageRepository } from "../../../shared/query"
import type { ContractRecord } from "../domain/types"

export const contractRepository = createLocalStorageRepository<ContractRecord>("tradgio_contracts")

export async function generateDocumentNo(): Promise<string> {
  const now = new Date()
  const y = String(now.getFullYear()).slice(2)
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const prefix = `HT${y}${m}`

  const all = await contractRepository.getAll()
  const sameMonth = all.filter((r) => r.contractNo.startsWith(prefix))
  const seq = String(sameMonth.length + 1).padStart(3, "0")
  return `${prefix}${seq}`
}
