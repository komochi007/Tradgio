import {
  INDEXED_DB_STORES,
  migrateBusinessDataToIndexedDb,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../persistence"
import type { DraftFormKey, DraftRecord } from "./types"

function buildDraftId(accountId: string, formKey: DraftFormKey): string {
  return `${accountId}:${formKey}`
}

async function runDraftOperation<T>(
  accountId: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  await migrateBusinessDataToIndexedDb(accountId)
  const database = await openTradgioDatabase()
  const transaction = database.transaction(INDEXED_DB_STORES.drafts, mode)
  const completion = transactionToPromise(transaction)
  try {
    const result = await operation(transaction.objectStore(INDEXED_DB_STORES.drafts))
    await completion
    return result
  } catch (error) {
    if (mode === "readwrite") {
      try {
        transaction.abort()
      } catch {}
    }
    await completion.catch(() => undefined)
    throw error
  } finally {
    database.close()
  }
}

export function getDraft<T>(
  accountId: string,
  formKey: DraftFormKey
): Promise<DraftRecord<T> | null> {
  return runDraftOperation(accountId, "readonly", async (store) => {
    const record = await requestToPromise(store.get(buildDraftId(accountId, formKey)))
    return record ? (record as DraftRecord<T>) : null
  })
}

export function saveDraft<T>(
  accountId: string,
  formKey: DraftFormKey,
  data: T
): Promise<DraftRecord<T>> {
  const record: DraftRecord<T> & { id: string } = {
    id: buildDraftId(accountId, formKey),
    accountId,
    formKey,
    data,
    updatedAt: new Date().toISOString(),
  }
  return runDraftOperation(accountId, "readwrite", async (store) => {
    await requestToPromise(store.put(record))
    return record
  })
}

export function removeDraft(accountId: string, formKey: DraftFormKey): Promise<void> {
  return runDraftOperation(accountId, "readwrite", async (store) => {
    await requestToPromise(store.delete(buildDraftId(accountId, formKey)))
  })
}
