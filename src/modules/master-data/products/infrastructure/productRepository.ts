import { createLocalStorageRepository } from "../../../../shared/query"
import type { Product } from "../domain/types"

export const productRepository = createLocalStorageRepository<Product>("tradgio_products")
