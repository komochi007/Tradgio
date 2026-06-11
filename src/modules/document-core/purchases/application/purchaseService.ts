import {
  AppError,
  generateId,
  requireCurrentAccountId,
  runLocalAtomicSave,
} from "../../../../shared"
import {
  applyPurchaseOrder,
  ledgerRepository,
  recalculateOrderDelta,
  snapshotRepository,
} from "../../../inventory-engine"
import type { InventoryOrderInput } from "../../../inventory-engine"
import type { PurchaseOrder, PurchaseFormData } from "../domain/types"
import { formDataToOrder, validatePurchaseForm } from "../domain/types"
import { purchaseRepository, generateDocumentNo } from "../infrastructure/purchaseRepository"
import { validateDocumentReferences } from "../../application/validateReferences"

export async function createPurchaseOrder(data: PurchaseFormData): Promise<PurchaseOrder> {
  const validationErrors = validatePurchaseForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateDocumentReferences(
    data.supplierId,
    "supplier",
    data.lines.map((line) => line.productId)
  )

  const accountId = requireCurrentAccountId()

  return runLocalAtomicSave(
    `${accountId}:purchase:create:${JSON.stringify(data)}`,
    [purchaseRepository, ledgerRepository, snapshotRepository],
    async () => {
      const order = formDataToOrder(data, undefined, accountId)
      order.id = generateId()
      order.documentNo = await generateDocumentNo()

      const inventoryInput: InventoryOrderInput = {
        documentId: order.id,
        accountId,
        documentType: "purchase",
        happenedAt: order.happenedAt,
        lines: order.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      }

      await purchaseRepository.create(order)
      await applyPurchaseOrder(inventoryInput)

      return order
    }
  )
}

export async function updatePurchaseOrder(
  id: string,
  data: PurchaseFormData
): Promise<PurchaseOrder> {
  const validationErrors = validatePurchaseForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateDocumentReferences(
    data.supplierId,
    "supplier",
    data.lines.map((line) => line.productId)
  )

  const accountId = requireCurrentAccountId()

  return runLocalAtomicSave(
    `${accountId}:purchase:update:${id}:${JSON.stringify(data)}`,
    [purchaseRepository, ledgerRepository, snapshotRepository],
    async () => {
      const existing = await purchaseRepository.getById(id)
      if (!existing) {
        throw new AppError("NOT_FOUND", `进货单不存在: ${id}`)
      }

      const prevInventoryInput: InventoryOrderInput = {
        documentId: existing.id,
        accountId: existing.accountId,
        documentType: "purchase",
        happenedAt: existing.happenedAt,
        lines: existing.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      }

      const nextOrder = formDataToOrder(data, existing)
      const nextInventoryInput: InventoryOrderInput = {
        documentId: nextOrder.id,
        accountId: nextOrder.accountId,
        documentType: "purchase",
        happenedAt: nextOrder.happenedAt,
        lines: nextOrder.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      }

      const saved = await purchaseRepository.update(id, nextOrder)
      await recalculateOrderDelta(prevInventoryInput, nextInventoryInput)
      return saved
    }
  )
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
  return purchaseRepository.getById(id)
}

export async function listPurchaseOrders(query?: {
  search?: string
  supplierId?: string
}): Promise<PurchaseOrder[]> {
  const all = await purchaseRepository.getAll()

  let filtered = all
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter(
      (o) =>
        o.documentNo.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        o.lines.some((l) => l.productName.toLowerCase().includes(q))
    )
  }

  if (query?.supplierId) {
    filtered = filtered.filter((o) => o.supplierId === query.supplierId)
  }

  return filtered.sort(
    (a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()
  )
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  throw new AppError("VALIDATION_ERROR", `进货单删除暂未开放，无法安全冲销库存: ${id}`)
}
