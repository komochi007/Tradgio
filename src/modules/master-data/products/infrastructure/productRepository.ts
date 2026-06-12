import { createIndexedDbRepository, indexedDbBusinessStores } from "../../../../shared/query"
import type { Product } from "../domain/types"

export const productRepository = createIndexedDbRepository<Product>(
  indexedDbBusinessStores.products
)
