import { requireCurrentAccountId } from "../../../shared/account"
import { indexedDbBusinessStores } from "../../../shared/query"
import type { IndexedDbRepository } from "../../../shared/query"
import {
  migrateBusinessDataToIndexedDb,
  openTradgioDatabase,
  transactionToPromise,
} from "../../../shared/persistence"
import type { ContractRecord } from "../domain/types"
import { contractRepository } from "./contractRepository"
import { migrateContractAttachmentsToBlob } from "./legacyAttachmentMigration"
import { indexedDbFileAdapter, type IndexedDbFileAdapter } from "./indexedDbFileAdapter"

type ContractTransactionContext = {
  contracts: IndexedDbRepository<ContractRecord>
  files: IndexedDbFileAdapter
}

const activeSaves = new Map<string, Promise<unknown>>()
let saveQueue: Promise<void> = Promise.resolve()

export async function runContractRead<T>(
  operation: (files: IndexedDbFileAdapter) => Promise<T>
): Promise<T> {
  const accountId = requireCurrentAccountId()
  await migrateBusinessDataToIndexedDb(accountId)
  await migrateContractAttachmentsToBlob()
  const database = await openTradgioDatabase()
  const transaction = database.transaction(
    [indexedDbBusinessStores.attachmentMetadata, indexedDbBusinessStores.attachmentBlobs],
    "readonly"
  )
  const completion = transactionToPromise(transaction)
  try {
    const result = await operation(indexedDbFileAdapter.bind(transaction))
    await completion
    return result
  } finally {
    database.close()
  }
}

export function runContractWrite<T>(
  saveKey: string,
  operation: (context: ContractTransactionContext) => Promise<T>
): Promise<T> {
  const activeSave = activeSaves.get(saveKey)
  if (activeSave) return activeSave as Promise<T>

  const execute = async () => {
    const accountId = requireCurrentAccountId()
    await migrateBusinessDataToIndexedDb(accountId)
    await migrateContractAttachmentsToBlob()
    const database = await openTradgioDatabase()
    const transaction = database.transaction(
      [
        indexedDbBusinessStores.contracts,
        indexedDbBusinessStores.attachmentMetadata,
        indexedDbBusinessStores.attachmentBlobs,
      ],
      "readwrite"
    )
    const completion = transactionToPromise(transaction)
    try {
      const result = await operation({
        contracts: contractRepository.bind(transaction),
        files: indexedDbFileAdapter.bind(transaction),
      })
      await completion
      return result
    } catch (error) {
      try {
        transaction.abort()
      } catch {}
      await completion.catch(() => undefined)
      throw error
    } finally {
      activeSaves.delete(saveKey)
      database.close()
    }
  }

  const promise = saveQueue.then(execute, execute)
  saveQueue = promise.then(
    () => undefined,
    () => undefined
  )
  activeSaves.set(saveKey, promise)
  return promise
}
