import { createIndexedDbRepository, indexedDbBusinessStores } from "../../../../shared/query"
import type { Counterparty } from "../domain/types"

export const counterpartyRepository = createIndexedDbRepository<Counterparty>(
  indexedDbBusinessStores.counterparties
)
