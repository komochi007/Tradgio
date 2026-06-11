import {
  AppError,
  generateId,
  requireCurrentAccountId,
  runLocalAtomicSave,
} from "../../../../shared"
import type { QuoteOrder, QuoteFormData } from "../domain/types"
import { formDataToOrder, validateQuoteForm } from "../domain/types"
import { quoteRepository, generateDocumentNo } from "../infrastructure/quoteRepository"
import { validateDocumentReferences } from "../../application/validateReferences"

export async function createQuoteOrder(data: QuoteFormData): Promise<QuoteOrder> {
  const validationErrors = validateQuoteForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateDocumentReferences(
    data.customerId,
    "customer",
    data.lines.map((line) => line.productId)
  )

  const accountId = requireCurrentAccountId()

  return runLocalAtomicSave(
    `${accountId}:quote:create:${JSON.stringify(data)}`,
    [quoteRepository],
    async () => {
      const order = formDataToOrder(data, undefined, accountId)
      order.id = generateId()
      order.documentNo = await generateDocumentNo()

      await quoteRepository.create(order)
      return order
    }
  )
}

export async function updateQuoteOrder(id: string, data: QuoteFormData): Promise<QuoteOrder> {
  const validationErrors = validateQuoteForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateDocumentReferences(
    data.customerId,
    "customer",
    data.lines.map((line) => line.productId)
  )

  const existing = await quoteRepository.getById(id)
  if (!existing) {
    throw new AppError("NOT_FOUND", `报价单不存在: ${id}`)
  }

  const nextOrder = formDataToOrder(data, existing)
  const saved = await quoteRepository.update(id, nextOrder)
  return saved
}

export async function getQuoteOrder(id: string): Promise<QuoteOrder | undefined> {
  return quoteRepository.getById(id)
}

export async function listQuoteOrders(query?: {
  search?: string
  customerId?: string
}): Promise<QuoteOrder[]> {
  const all = await quoteRepository.getAll()

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

export async function deleteQuoteOrder(id: string): Promise<void> {
  await quoteRepository.remove(id)
}
