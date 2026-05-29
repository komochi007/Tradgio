export type PurchaseLine = {
  id: string
  productId: string
  productName: string
  spec: string
  unit: string
  quantity: number
  unitPrice: number
  lineAmount: number
}

export type PurchaseOrder = {
  id: string
  type: "purchase"
  documentNo: string
  supplierId: string
  supplierName: string
  happenedAt: string
  remark: string
  totalAmount: number
  lines: PurchaseLine[]
  createdAt: string
  updatedAt: string
}

export type PurchaseFormLine = {
  key: string
  productId: string
  productName: string
  spec: string
  unit: string
  quantity: string
  unitPrice: string
}

export type PurchaseFormData = {
  supplierId: string
  supplierName: string
  happenedAt: string
  remark: string
  lines: PurchaseFormLine[]
}

export function validatePurchaseForm(data: PurchaseFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.supplierId) {
    errors.supplierId = "请选择供应商"
  }

  if (!data.happenedAt) {
    errors.happenedAt = "请选择日期"
  }

  if (data.lines.length === 0) {
    errors.lines = "至少添加一条货品明细"
  }

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]
    if (!line.productId) {
      errors[`line_${i}_productId`] = "请选择货品"
    }
    const qty = Number(line.quantity)
    if (!line.quantity || isNaN(qty) || qty <= 0) {
      errors[`line_${i}_quantity`] = "数量必须大于 0"
    }
    const price = Number(line.unitPrice)
    if (line.unitPrice === "" || isNaN(price) || price < 0) {
      errors[`line_${i}_unitPrice`] = "请输入有效单价"
    }
  }

  return errors
}

export function emptyPurchaseLine(): PurchaseFormLine {
  return {
    key: Math.random().toString(36).slice(2, 10),
    productId: "",
    productName: "",
    spec: "",
    unit: "",
    quantity: "",
    unitPrice: "",
  }
}

export function emptyPurchaseForm(): PurchaseFormData {
  return {
    supplierId: "",
    supplierName: "",
    happenedAt: new Date().toISOString().slice(0, 10),
    remark: "",
    lines: [emptyPurchaseLine()],
  }
}

export function orderToFormData(order: PurchaseOrder): PurchaseFormData {
  return {
    supplierId: order.supplierId,
    supplierName: order.supplierName,
    happenedAt: order.happenedAt.slice(0, 10),
    remark: order.remark,
    lines: order.lines.map((l) => ({
      key: l.id,
      productId: l.productId,
      productName: l.productName,
      spec: l.spec,
      unit: l.unit,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
    })),
  }
}

export function formDataToOrder(
  data: PurchaseFormData,
  existing?: PurchaseOrder
): PurchaseOrder {
  const now = new Date().toISOString()
  const lines: PurchaseLine[] = data.lines.map((l) => {
    const qty = Number(l.quantity)
    const price = Number(l.unitPrice)
    return {
      id: l.key,
      productId: l.productId,
      productName: l.productName,
      spec: l.spec,
      unit: l.unit,
      quantity: qty,
      unitPrice: price,
      lineAmount: Math.round(qty * price * 100) / 100,
    }
  })

  const totalAmount = Math.round(lines.reduce((sum, l) => sum + l.lineAmount, 0) * 100) / 100

  return {
    id: existing?.id ?? "",
    type: "purchase",
    documentNo: existing?.documentNo ?? "",
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    happenedAt: data.happenedAt,
    remark: data.remark,
    totalAmount,
    lines,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}
