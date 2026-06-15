import {
  AppError,
  ATTACHMENT_MAX_FILE_SIZE,
  estimateAttachmentStorage,
  generateId,
  requireCurrentAccountId,
} from "../../../shared"
import type { AttachmentStorageStatus } from "../../../shared"
import type { IndexedDbFileAdapter } from "../infrastructure/indexedDbFileAdapter"
import type { ContractRecord, ContractAttachment, ContractFormData } from "../domain/types"
import { validateContractForm, validateFile } from "../domain/types"
import { contractRepository, generateDocumentNo } from "../infrastructure/contractRepository"
import { runContractRead, runContractWrite } from "../infrastructure/contractTransaction"
import { migrateContractAttachmentsToBlob } from "../infrastructure/legacyAttachmentMigration"
import { counterpartyRepository } from "../../master-data/counterparties"

async function validateCustomerReference(customerId: string): Promise<void> {
  const customer = await counterpartyRepository.getById(customerId)
  if (!customer || customer.type !== "customer") {
    throw new AppError("VALIDATION_ERROR", "客户不存在或不属于当前账号")
  }
}

function validateFiles(files: File[]): void {
  for (const file of files) {
    const fileError = validateFile(file)
    if (fileError) throw new AppError("VALIDATION_ERROR", fileError)
  }
}

async function saveFile(
  file: File,
  contractId: string,
  files: IndexedDbFileAdapter
): Promise<ContractAttachment> {
  const attachmentId = generateId()
  const uploadedAt = new Date().toISOString()
  const metadata = await files.save({
    id: attachmentId,
    contractId,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    uploadedAt,
    blob: file,
  })
  return {
    attachmentId: metadata.id,
    fileName: metadata.fileName,
    mimeType: metadata.mimeType,
    fileSize: metadata.fileSize,
    uploadedAt: metadata.uploadedAt,
  }
}

export async function checkAttachmentStorageCapacity(
  files: File[],
  storageManager?: Pick<StorageManager, "estimate">
): Promise<AttachmentStorageStatus> {
  validateFiles(files)
  if (files.length === 0) {
    return {
      usage: null,
      quota: null,
      projectedUsageRatio: null,
      level: "normal",
      message: null,
    }
  }
  const status = await estimateAttachmentStorage(
    files.reduce((total, file) => total + file.size, 0),
    storageManager
  )
  if (status.level === "blocked") {
    throw new AppError("UPLOAD_ERROR", status.message ?? "本地存储空间不足")
  }
  return status
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
  await checkAttachmentStorageCapacity(files)
  const accountId = requireCurrentAccountId()

  return runContractWrite(
    `${accountId}:contract:create:${JSON.stringify(data)}:${files
      .map((file) => `${file.name}:${file.size}`)
      .join(",")}`,
    async ({ contracts, files: fileAdapter }) => {
      const now = new Date().toISOString()
      const contractId = generateId()
      const attachments: ContractAttachment[] = []
      for (const file of files) {
        attachments.push(await saveFile(file, contractId, fileAdapter))
      }
      const record: ContractRecord = {
        id: contractId,
        accountId,
        contractNo: await generateDocumentNo(new Date(), contracts),
        title: data.title.trim(),
        customerId: data.customerId,
        customerName: data.customerName,
        signDate: data.signDate,
        remark: data.remark.trim(),
        attachments,
        createdAt: now,
        updatedAt: now,
      }
      await contracts.create(record)
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
  await checkAttachmentStorageCapacity(newFiles)
  const accountId = requireCurrentAccountId()

  return runContractWrite(`${accountId}:contract:update:${id}`, async ({ contracts, files }) => {
    const existing = await contracts.getById(id)
    if (!existing) throw new AppError("NOT_FOUND", `合同记录不存在: ${id}`)
    const attachments = [...existing.attachments]
    for (const file of newFiles) {
      attachments.push(await saveFile(file, id, files))
    }
    return contracts.update(id, {
      title: data.title.trim(),
      customerId: data.customerId,
      customerName: data.customerName,
      signDate: data.signDate,
      remark: data.remark.trim(),
      attachments,
      updatedAt: new Date().toISOString(),
    })
  })
}

export async function removeAttachment(
  contractId: string,
  attachmentId: string
): Promise<ContractRecord> {
  const accountId = requireCurrentAccountId()
  return runContractWrite(
    `${accountId}:contract:${contractId}:remove:${attachmentId}`,
    async ({ contracts, files }) => {
      const record = await contracts.getById(contractId)
      if (!record) throw new AppError("NOT_FOUND", "合同记录不存在")
      if (!record.attachments.some((attachment) => attachment.attachmentId === attachmentId)) {
        throw new AppError("NOT_FOUND", "附件不存在")
      }
      await files.remove(attachmentId)
      return contracts.update(contractId, {
        attachments: record.attachments.filter(
          (attachment) => attachment.attachmentId !== attachmentId
        ),
        updatedAt: new Date().toISOString(),
      })
    }
  )
}

export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  return runContractRead((files) => files.download(attachmentId))
}

export async function getContractRecord(id: string): Promise<ContractRecord | undefined> {
  await migrateContractAttachmentsToBlob()
  return contractRepository.getById(id)
}

export async function listContractRecords(query?: {
  search?: string
  customerId?: string
}): Promise<ContractRecord[]> {
  await migrateContractAttachmentsToBlob()
  const all = await contractRepository.getAll()
  let filtered = all
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter(
      (record) =>
        record.contractNo.toLowerCase().includes(q) ||
        record.title.toLowerCase().includes(q) ||
        record.customerName.toLowerCase().includes(q)
    )
  }
  if (query?.customerId) {
    filtered = filtered.filter((record) => record.customerId === query.customerId)
  }
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function deleteContractRecord(id: string): Promise<void> {
  const accountId = requireCurrentAccountId()
  await runContractWrite(`${accountId}:contract:delete:${id}`, async ({ contracts, files }) => {
    const record = await contracts.getById(id)
    if (!record) throw new AppError("NOT_FOUND", "合同记录不存在")
    for (const attachment of record.attachments) {
      await files.remove(attachment.attachmentId)
    }
    await contracts.remove(id)
  })
}

export { ATTACHMENT_MAX_FILE_SIZE }
