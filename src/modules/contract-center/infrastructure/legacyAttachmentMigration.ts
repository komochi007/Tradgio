import { requireCurrentAccountId } from "../../../shared/account"
import { indexedDbBusinessStores } from "../../../shared/query"
import {
  migrateBusinessDataToIndexedDb,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../../../shared/persistence"
import type { ContractAttachment, ContractRecord } from "../domain/types"

export const CONTRACT_ATTACHMENT_MIGRATION_ID = "contract-attachments-base64-v1"

type LegacyAttachment = Omit<ContractAttachment, "attachmentId"> & {
  id: string
  dataUrl?: string
}

type AttachmentMigrationReport = {
  id: string
  version: 1
  completedAt: string
  contractCount: number
  attachmentCount: number
  totalBytes: number
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?;base64,(.+)$/s.exec(dataUrl)
  if (!match) throw new Error("旧附件数据格式无效")
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0))
  return new Blob([bytes], { type: match[1] || "application/octet-stream" })
}

let activeMigration: Promise<AttachmentMigrationReport> | null = null

async function executeMigration(): Promise<AttachmentMigrationReport> {
  const database = await openTradgioDatabase()
  const transaction = database.transaction(
    [
      indexedDbBusinessStores.contracts,
      indexedDbBusinessStores.attachmentMetadata,
      indexedDbBusinessStores.attachmentBlobs,
      indexedDbBusinessStores.migrationRecords,
    ],
    "readwrite"
  )
  const completion = transactionToPromise(transaction)
  try {
    const migrationStore = transaction.objectStore(indexedDbBusinessStores.migrationRecords)
    const existing = await requestToPromise(migrationStore.get(CONTRACT_ATTACHMENT_MIGRATION_ID))
    if (existing) {
      await completion
      return existing as AttachmentMigrationReport
    }

    const contractStore = transaction.objectStore(indexedDbBusinessStores.contracts)
    const metadataStore = transaction.objectStore(indexedDbBusinessStores.attachmentMetadata)
    const blobStore = transaction.objectStore(indexedDbBusinessStores.attachmentBlobs)
    const contracts = (await requestToPromise(contractStore.getAll())) as ContractRecord[]
    let attachmentCount = 0
    let totalBytes = 0

    for (const contract of contracts) {
      const attachments = contract.attachments as unknown as LegacyAttachment[]
      const nextAttachments: ContractAttachment[] = []
      for (const attachment of attachments) {
        if (!attachment.dataUrl) {
          nextAttachments.push(attachment as unknown as ContractAttachment)
          continue
        }
        const blob = dataUrlToBlob(attachment.dataUrl)
        if (blob.size !== attachment.fileSize) {
          throw new Error(`旧附件大小校验失败: ${attachment.fileName}`)
        }
        const attachmentId = attachment.id
        await requestToPromise(
          metadataStore.add({
            id: attachmentId,
            accountId: contract.accountId,
            contractId: contract.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            uploadedAt: attachment.uploadedAt,
          })
        )
        await requestToPromise(
          blobStore.add({ id: attachmentId, accountId: contract.accountId, blob })
        )
        nextAttachments.push({
          attachmentId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.uploadedAt,
        })
        attachmentCount += 1
        totalBytes += blob.size
      }
      if (nextAttachments.some((attachment) => "attachmentId" in attachment)) {
        await requestToPromise(contractStore.put({ ...contract, attachments: nextAttachments }))
      }
    }

    const report: AttachmentMigrationReport = {
      id: CONTRACT_ATTACHMENT_MIGRATION_ID,
      version: 1,
      completedAt: new Date().toISOString(),
      contractCount: contracts.length,
      attachmentCount,
      totalBytes,
    }
    await requestToPromise(migrationStore.add(report))
    await completion
    return report
  } catch (error) {
    try {
      transaction.abort()
    } catch {}
    await completion.catch(() => undefined)
    throw error
  } finally {
    database.close()
  }
}

export async function migrateContractAttachmentsToBlob(): Promise<AttachmentMigrationReport> {
  await migrateBusinessDataToIndexedDb(requireCurrentAccountId())
  if (activeMigration) return activeMigration
  activeMigration = executeMigration().finally(() => {
    activeMigration = null
  })
  return activeMigration
}
