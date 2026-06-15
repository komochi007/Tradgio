import { AppError } from "../../../shared/errors"
import { requireCurrentAccountId } from "../../../shared/account"
import { indexedDbBusinessStores } from "../../../shared/query"
import { requestToPromise } from "../../../shared/persistence"
import type { AttachmentMetadata, FileSaveInput } from "../../../shared/persistence"

type AttachmentBlobRecord = {
  id: string
  accountId: string
  blob: Blob
}

export class IndexedDbFileAdapter {
  constructor(private readonly transaction?: IDBTransaction) {}

  bind(transaction: IDBTransaction): IndexedDbFileAdapter {
    return new IndexedDbFileAdapter(transaction)
  }

  async save(input: FileSaveInput): Promise<AttachmentMetadata> {
    if (!this.transaction) {
      throw new AppError("UPLOAD_ERROR", "附件保存必须在合同事务中执行")
    }
    const accountId = requireCurrentAccountId()
    const { blob, ...metadataInput } = input
    if (blob.size !== input.fileSize) {
      throw new AppError("UPLOAD_ERROR", `附件大小校验失败: ${input.fileName}`)
    }
    const metadata: AttachmentMetadata = { ...metadataInput, accountId }
    const blobRecord: AttachmentBlobRecord = { id: input.id, accountId, blob }
    await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentMetadata).add(metadata)
    )
    await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentBlobs).add(blobRecord)
    )
    return metadata
  }

  async getMetadata(attachmentId: string): Promise<AttachmentMetadata | undefined> {
    if (!this.transaction) {
      throw new AppError("UPLOAD_ERROR", "附件元数据读取缺少事务")
    }
    const accountId = requireCurrentAccountId()
    const metadata = (await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentMetadata).get(attachmentId)
    )) as AttachmentMetadata | undefined
    return metadata?.accountId === accountId ? metadata : undefined
  }

  async download(attachmentId: string): Promise<Blob> {
    if (!this.transaction) {
      throw new AppError("UPLOAD_ERROR", "附件下载缺少读取事务")
    }
    const accountId = requireCurrentAccountId()
    const metadata = (await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentMetadata).get(attachmentId)
    )) as AttachmentMetadata | undefined
    const blobRecord = (await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentBlobs).get(attachmentId)
    )) as AttachmentBlobRecord | undefined
    if (
      !metadata ||
      !blobRecord ||
      metadata.accountId !== accountId ||
      blobRecord.accountId !== accountId
    ) {
      throw new AppError("NOT_FOUND", "附件不存在")
    }
    return blobRecord.blob
  }

  async remove(attachmentId: string): Promise<void> {
    if (!this.transaction) {
      throw new AppError("UPLOAD_ERROR", "附件删除必须在合同事务中执行")
    }
    const accountId = requireCurrentAccountId()
    const metadata = (await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentMetadata).get(attachmentId)
    )) as AttachmentMetadata | undefined
    const blobRecord = (await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentBlobs).get(attachmentId)
    )) as AttachmentBlobRecord | undefined
    if (
      !metadata ||
      !blobRecord ||
      metadata.accountId !== accountId ||
      blobRecord.accountId !== accountId
    ) {
      throw new AppError("NOT_FOUND", "附件不存在")
    }
    await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentMetadata).delete(attachmentId)
    )
    await requestToPromise(
      this.transaction.objectStore(indexedDbBusinessStores.attachmentBlobs).delete(attachmentId)
    )
  }
}

export const indexedDbFileAdapter = new IndexedDbFileAdapter()
