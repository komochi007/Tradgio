export type QuoteLine = {
  id: string
  productId: string
  productName: string
  spec: string
  composition: string
  color: string
  bulkMoq: string
  unit: string
  quantity: number
  taxExcludedUnitPrice: number | null
  unitPrice: number
  lineAmount: number
  dyeingFee: string
  leadTime: string
}

export type QuoteOrder = {
  id: string
  type: "quote"
  documentNo: string
  customerId: string
  customerName: string
  happenedAt: string
  remark: string
  totalAmount: number
  lines: QuoteLine[]
  createdAt: string
  updatedAt: string
}

export type QuoteFormLine = {
  key: string
  productId: string
  productName: string
  spec: string
  composition: string
  color: string
  bulkMoq: string
  unit: string
  quantity: string
  taxExcludedUnitPrice: string
  unitPrice: string
  dyeingFee: string
  leadTime: string
}

export type QuoteFormData = {
  customerId: string
  customerName: string
  happenedAt: string
  remark: string
  lines: QuoteFormLine[]
}

export function validateQuoteForm(data: QuoteFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.customerId) {
    errors.customerId = "请选择客户"
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
    if (line.taxExcludedUnitPrice !== "") {
      const usdPrice = Number(line.taxExcludedUnitPrice)
      if (isNaN(usdPrice) || usdPrice < 0) {
        errors[`line_${i}_taxExcludedUnitPrice`] = "请输入有效 USD 单价"
      }
    }
    if (line.composition.length > 50) {
      errors[`line_${i}_composition`] = "成分不能超过 50 个字"
    }
    if (line.color.length > 30) {
      errors[`line_${i}_color`] = "颜色不能超过 30 个字"
    }
    if (line.bulkMoq.length > 30) {
      errors[`line_${i}_bulkMoq`] = "大货起订量不能超过 30 个字"
    }
    if (line.dyeingFee.length > 50) {
      errors[`line_${i}_dyeingFee`] = "染色费/版费不能超过 50 个字"
    }
    if (line.leadTime.length > 30) {
      errors[`line_${i}_leadTime`] = "货期不能超过 30 个字"
    }
  }

  return errors
}

export function emptyQuoteLine(): QuoteFormLine {
  return {
    key: Math.random().toString(36).slice(2, 10),
    productId: "",
    productName: "",
    spec: "",
    composition: "",
    color: "",
    bulkMoq: "",
    unit: "",
    quantity: "",
    taxExcludedUnitPrice: "",
    unitPrice: "",
    dyeingFee: "",
    leadTime: "",
  }
}

export function emptyQuoteForm(): QuoteFormData {
  return {
    customerId: "",
    customerName: "",
    happenedAt: new Date().toISOString().slice(0, 10),
    remark: "",
    lines: [emptyQuoteLine()],
  }
}

export function orderToFormData(order: QuoteOrder): QuoteFormData {
  return {
    customerId: order.customerId,
    customerName: order.customerName,
    happenedAt: order.happenedAt.slice(0, 10),
    remark: order.remark,
    lines: order.lines.map((l) => ({
      key: l.id,
      productId: l.productId,
      productName: l.productName,
      spec: l.spec,
      composition: l.composition ?? "",
      color: l.color ?? "",
      bulkMoq: l.bulkMoq ?? "",
      unit: l.unit,
      quantity: String(l.quantity),
      taxExcludedUnitPrice: l.taxExcludedUnitPrice?.toString() ?? "",
      unitPrice: String(l.unitPrice),
      dyeingFee: l.dyeingFee ?? "",
      leadTime: l.leadTime ?? "",
    })),
  }
}

export function formDataToOrder(
  data: QuoteFormData,
  existing?: QuoteOrder
): QuoteOrder {
  const now = new Date().toISOString()
  const lines: QuoteLine[] = data.lines.map((l) => {
    const qty = Number(l.quantity)
    const price = Number(l.unitPrice)
    const taxExcludedUnitPrice =
      l.taxExcludedUnitPrice === "" ? null : Number(l.taxExcludedUnitPrice)
    return {
      id: l.key,
      productId: l.productId,
      productName: l.productName,
      spec: l.spec,
      composition: l.composition.trim(),
      color: l.color.trim(),
      bulkMoq: l.bulkMoq.trim(),
      unit: l.unit,
      quantity: qty,
      taxExcludedUnitPrice,
      unitPrice: price,
      lineAmount: Math.round(qty * price * 100) / 100,
      dyeingFee: l.dyeingFee.trim(),
      leadTime: l.leadTime.trim(),
    }
  })

  const totalAmount = Math.round(lines.reduce((sum, l) => sum + l.lineAmount, 0) * 100) / 100

  return {
    id: existing?.id ?? "",
    type: "quote",
    documentNo: existing?.documentNo ?? "",
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
