import { createLocalStorageRepository } from "../../../../shared/query"
import type { Counterparty } from "../domain/types"

export const counterpartyRepository = createLocalStorageRepository<Counterparty>("tradgio_counterparties")
