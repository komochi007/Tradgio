export type SalesLine = {
  id: string
  productId: string
  productCode: string
  productName: string
  spec: string
  color: string
  unit: string
  quantity: number
  unitPrice: number
  lineAmount: number
  lineRemark: string
}

export type SalesOrder = {
  id: string
  accountId: string
  type: "sales"
  documentNo: string
  customerOrderNo?: string
  customerId: string
  customerName: string
  happenedAt: string
  remark: string
  totalAmount: number
  lines: SalesLine[]
  createdAt: string
  updatedAt: string
}

export type SalesFormLine = {
  key: string
  productId: string
  productCode: string
  productName: string
  spec: string
  color: string
  unit: string
  quantity: string
  unitPrice: string
  lineRemark: string
}

export type SalesFormData = {
  customerOrderNo: string
  customerId: string
  customerName: string
  happenedAt: string
  remark: string
  lines: SalesFormLine[]
}

export function validateSalesForm(data: SalesFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.customerId) {
    errors.customerId = "请选择客户"
  }

  if (!data.customerOrderNo.trim()) {
    errors.customerOrderNo = "请输入订单号"
  } else if (data.customerOrderNo.length > 50) {
    errors.customerOrderNo = "订单号不能超过 50 个字"
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
    if (line.productCode.length > 30) {
      errors[`line_${i}_productCode`] = "产品编号不能超过 30 个字"
    }
    if (line.color.length > 30) {
      errors[`line_${i}_color`] = "颜色不能超过 30 个字"
    }
    if (line.lineRemark.length > 80) {
      errors[`line_${i}_lineRemark`] = "备注不能超过 80 个字"
    }
  }

  return errors
}

export function emptySalesLine(): SalesFormLine {
  return {
    key: Math.random().toString(36).slice(2, 10),
    productId: "",
    productCode: "",
    productName: "",
    spec: "",
    color: "",
    unit: "",
    quantity: "",
    unitPrice: "",
    lineRemark: "",
  }
}

export function emptySalesForm(): SalesFormData {
  return {
    customerOrderNo: "",
    customerId: "",
    customerName: "",
    happenedAt: new Date().toISOString().slice(0, 10),
    remark: "",
    lines: [emptySalesLine()],
  }
}

export function orderToFormData(order: SalesOrder): SalesFormData {
  return {
    customerOrderNo: order.customerOrderNo ?? "",
    customerId: order.customerId,
    customerName: order.customerName,
    happenedAt: order.happenedAt.slice(0, 10),
    remark: order.remark,
    lines: order.lines.map((l) => ({
      key: l.id,
      productId: l.productId,
      productCode: l.productCode ?? "",
      productName: l.productName,
      spec: l.spec,
      color: l.color ?? "",
      unit: l.unit,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      lineRemark: l.lineRemark ?? "",
    })),
  }
}

export function formDataToOrder(
  data: SalesFormData,
  existing?: SalesOrder,
  accountId = existing?.accountId ?? ""
): SalesOrder {
  const now = new Date().toISOString()
  const lines: SalesLine[] = data.lines.map((l) => {
    const qty = Number(l.quantity)
    const price = Number(l.unitPrice)
    return {
      id: l.key,
      productId: l.productId,
      productCode: l.productCode.trim(),
      productName: l.productName,
      spec: l.spec,
      color: l.color.trim(),
      unit: l.unit,
      quantity: qty,
      unitPrice: price,
      lineAmount: Math.round(qty * price * 100) / 100,
      lineRemark: l.lineRemark.trim(),
    }
  })

  const totalAmount = Math.round(lines.reduce((sum, l) => sum + l.lineAmount, 0) * 100) / 100

  return {
    id: existing?.id ?? "",
    accountId,
    type: "sales",
    documentNo: existing?.documentNo ?? "",
    customerOrderNo: data.customerOrderNo.trim(),
    customerId: data.customerId,
    customerName: data.customerName,
    happenedAt: data.happenedAt,
    remark: data.remark,
    totalAmount,
    lines,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}
