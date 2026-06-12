import {
  AppError,
  generateId,
  requireCurrentAccountId,
  runIndexedDbAtomicSave,
} from "../../../shared"
import type { ContractRecord, ContractAttachment, ContractFormData } from "../domain/types"
import { validateContractForm, validateFile } from "../domain/types"
import { contractRepository, generateDocumentNo } from "../infrastructure/contractRepository"
import { counterpartyRepository } from "../../master-data/counterparties"

async function validateCustomerReference(customerId: string): Promise<void> {
  const customer = await counterpartyRepository.getById(customerId)
  if (!customer || customer.type !== "customer") {
    throw new AppError("VALIDATION_ERROR", "客户不存在或不属于当前账号")
  }
}

function fileToAttachment(file: File): Promise<ContractAttachment> {
  return new Promise((resolve, reject) => {
    const validationError = validateFile(file)
    if (validationError) {
      reject(new AppError("VALIDATION_ERROR", validationError))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: generateId(),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      })
    }
    reader.onerror = () => {
      reject(new AppError("UPLOAD_ERROR", `文件读取失败: ${file.name}`))
    }
    reader.readAsDataURL(file)
  })
}

export async function createContractRecord(
  data: ContractFormData,
  files: File[]
): Promise<ContractRecord> {
  const validationErrors = validateContractForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateCustomerReference(data.customerId)

  for (const file of files) {
    const fileError = validateFile(file)
    if (fileError) {
      throw new AppError("VALIDATION_ERROR", fileError)
    }
  }

  let attachments: ContractAttachment[] = []
  try {
    attachments = await Promise.all(files.map((f) => fileToAttachment(f)))
  } catch {
    throw new AppError("UPLOAD_ERROR", "文件上传失败，请重试")
  }

  const accountId = requireCurrentAccountId()

  return runIndexedDbAtomicSave(
    `${accountId}:contract:create:${JSON.stringify(data)}:${attachments
      .map((attachment) => attachment.fileName)
      .join(",")}`,
    [contractRepository],
    async ([contractTx]) => {
      const now = new Date().toISOString()
      const record: ContractRecord = {
        id: generateId(),
        accountId,
        contractNo: await generateDocumentNo(new Date(), contractTx),
        title: data.title.trim(),
        customerId: data.customerId,
        customerName: data.customerName,
        signDate: data.signDate,
        remark: data.remark.trim(),
        attachments,
        createdAt: now,
        updatedAt: now,
      }

      await contractTx.create(record)
      return record
    }
  )
}

export async function updateContractRecord(
  id: string,
  data: ContractFormData,
  newFiles: File[]
): Promise<ContractRecord> {
  const validationErrors = validateContractForm(data)
  if (Object.keys(validationErrors).length > 0) {
    throw new AppError("VALIDATION_ERROR", "表单校验不通过", validationErrors)
  }

  await validateCustomerReference(data.customerId)

  const existing = await contractRepository.getById(id)
  if (!existing) {
    throw new AppError("NOT_FOUND", `合同记录不存在: ${id}`)
  }

  for (const file of newFiles) {
    const fileError = validateFile(file)
    if (fileError) {
      throw new AppError("VALIDATION_ERROR", fileError)
    }
  }

  let newAttachments: ContractAttachment[] = []
  try {
    newAttachments = await Promise.all(newFiles.map((f) => fileToAttachment(f)))
  } catch {
    throw new AppError("UPLOAD_ERROR", "文件上传失败，请重试")
  }

  const updated: ContractRecord = {
    ...existing,
    title: data.title.trim(),
    customerId: data.customerId,
    customerName: data.customerName,
    signDate: data.signDate,
    remark: data.remark.trim(),
    attachments: [...existing.attachments, ...newAttachments],
    updatedAt: new Date().toISOString(),
  }

  await contractRepository.update(id, updated)
  return updated
}

export async function removeAttachment(
  contractId: string,
  attachmentId: string
): Promise<ContractRecord> {
  const record = await contractRepository.getById(contractId)
  if (!record) {
    throw new AppError("NOT_FOUND", "合同记录不存在")
  }

  const updated: ContractRecord = {
    ...record,
    attachments: record.attachments.filter((a) => a.id !== attachmentId),
    updatedAt: new Date().toISOString(),
  }

  await contractRepository.update(contractId, updated)
  return updated
}

export async function getContractRecord(id: string): Promise<ContractRecord | undefined> {
  return contractRepository.getById(id)
}

export async function listContractRecords(query?: {
  search?: string
  customerId?: string
}): Promise<ContractRecord[]> {
  const all = await contractRepository.getAll()

  let filtered = all
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.contractNo.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
    )
  }

  if (query?.customerId) {
    filtered = filtered.filter((r) => r.customerId === query.customerId)
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function deleteContractRecord(id: string): Promise<void> {
  await contractRepository.remove(id)
}
