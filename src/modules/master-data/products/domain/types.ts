export const ProductUnits = ["个", "件", "箱", "卷", "码"] as const
export type ProductUnit = (typeof ProductUnits)[number]

export type ProductStatus = "active" | "inactive"

export type Product = {
  id: string
  name: string
  spec: string
  unit: ProductUnit
  productType: string
  defaultPurchasePrice: number | null
  defaultSalesPrice: number | null
  notes: string
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export type ProductFormData = {
  name: string
  spec: string
  unit: ProductUnit
  productType: string
  defaultPurchasePrice: string
  defaultSalesPrice: string
  notes: string
}

export function validateProductForm(data: ProductFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) {
    errors.name = "请输入货品名称"
  } else if (data.name.length > 50) {
    errors.name = "货品名称不能超过 50 个字"
  }

  if (data.spec.length > 50) {
    errors.spec = "规格型号不能超过 50 个字"
  }

  if (!data.unit) {
    errors.unit = "请选择单位"
  }

  if (data.productType.length > 30) {
    errors.productType = "产品类型不能超过 30 个字"
  }

  if (data.defaultPurchasePrice !== "") {
    const price = Number(data.defaultPurchasePrice)
    if (isNaN(price) || price < 0) {
      errors.defaultPurchasePrice = "请输入有效的价格"
    }
  }

  if (data.defaultSalesPrice !== "") {
    const price = Number(data.defaultSalesPrice)
    if (isNaN(price) || price < 0) {
      errors.defaultSalesPrice = "请输入有效的价格"
    }
  }

  if (data.notes.length > 200) {
    errors.notes = "备注不能超过 200 个字"
  }

  return errors
}

export function emptyProductForm(): ProductFormData {
  return {
    name: "",
    spec: "",
    unit: "" as ProductUnit,
    productType: "",
    defaultPurchasePrice: "",
    defaultSalesPrice: "",
    notes: "",
  }
}

export function productToFormData(product: Product): ProductFormData {
  return {
    name: product.name,
    spec: product.spec,
    unit: product.unit,
    productType: product.productType,
    defaultPurchasePrice: product.defaultPurchasePrice?.toString() ?? "",
    defaultSalesPrice: product.defaultSalesPrice?.toString() ?? "",
    notes: product.notes,
  }
}
