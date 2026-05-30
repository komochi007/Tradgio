import { AppError, generateId } from "../../../../shared"
import { applySalesOrder, recalculateOrderDelta, getStockAlerts } from "../../../inventory-engine"
import type { InventoryOrderInput } from "../../../inventory-engine"
import type { SalesOrder, SalesFormData } from "../domain/types"
import { formDataToOrder, validateSalesForm } from "../domain/types"
import { salesRepository, generateDocumentNo } from "../infrastructure/salesRepository"

export async function createSalesOrder(
  data: SalesFormData
): Promise<SalesOrder> {
  const validationErrors = validateSalesForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  const order = formDataToOrder(data)
  order.id = generateId()
  order.documentNo = await generateDocumentNo()

  const inventoryInput: InventoryOrderInput = {
    documentId: order.id,
    documentType: "sales",
    happenedAt: order.happenedAt,
    lines: order.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    })),
  }

  await applySalesOrder(inventoryInput)
  await salesRepository.create(order)

  return order
}

export async function updateSalesOrder(
  id: string,
  data: SalesFormData
): Promise<SalesOrder> {
  const validationErrors = validateSalesForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  const existing = await salesRepository.getById(id)
  if (!existing) {
    throw new AppError("NOT_FOUND", `出货单不存在: ${id}`)
  }

  const prevInventoryInput: InventoryOrderInput = {
    documentId: existing.id,
    documentType: "sales",
    happenedAt: existing.happenedAt,
    lines: existing.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    })),
  }

  const nextOrder = formDataToOrder(data, existing)
  const nextInventoryInput: InventoryOrderInput = {
    documentId: nextOrder.id,
    documentType: "sales",
    happenedAt: nextOrder.happenedAt,
    lines: nextOrder.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    })),
  }

  await recalculateOrderDelta(prevInventoryInput, nextInventoryInput)

  const saved = await salesRepository.update(id, nextOrder)
  return saved
}

export async function getSalesOrder(id: string): Promise<SalesOrder | undefined> {
  return salesRepository.getById(id)
}

export async function listSalesOrders(
  query?: { search?: string; customerId?: string }
): Promise<SalesOrder[]> {
  const all = await salesRepository.getAll()

  let filtered = all
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter(
      (o) =>
        o.documentNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.lines.some((l) => l.productName.toLowerCase().includes(q))
    )
  }

  if (query?.customerId) {
    filtered = filtered.filter((o) => o.customerId === query.customerId)
  }

  return filtered.sort(
    (a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()
  )
}

export async function deleteSalesOrder(id: string): Promise<void> {
  await salesRepository.remove(id)
}

export async function checkStockShortage(
  lines: Array<{ productId: string; productName: string; quantity: number }>
): Promise<Array<{ productId: string; productName: string; currentStock: number; shortage: number }>> {
  const alerts = await getStockAlerts(lines)
  return alerts.map((a) => {
    const line = lines.find((l) => l.productId === a.productId)
    return {
      productId: a.productId,
      productName: line?.productName ?? "",
      currentStock: a.currentStock,
      shortage: a.shortage,
    }
  })
}
