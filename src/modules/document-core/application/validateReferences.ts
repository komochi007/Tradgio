import { AppError } from "../../../shared"
import { counterpartyRepository } from "../../master-data/counterparties"
import { productRepository } from "../../master-data/products"

export async function validateDocumentReferences(
  counterpartyId: string,
  counterpartyType: "customer" | "supplier",
  productIds: string[]
): Promise<void> {
  const counterparty = await counterpartyRepository.getById(counterpartyId)
  if (!counterparty || counterparty.type !== counterpartyType) {
    throw new AppError("VALIDATION_ERROR", "往来单位不存在或不属于当前账号")
  }

  const uniqueProductIds = [...new Set(productIds)]
  const products = await Promise.all(
    uniqueProductIds.map((productId) => productRepository.getById(productId))
  )
  if (products.some((product) => !product)) {
    throw new AppError("VALIDATION_ERROR", "货品不存在或不属于当前账号")
  }
}
