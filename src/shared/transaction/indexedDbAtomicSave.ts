import { AppError } from "../errors"
import { requireCurrentAccountId } from "../account"
import {
  migrateBusinessDataToIndexedDb,
  openTradgioDatabase,
  transactionToPromise,
} from "../persistence"
import type { IndexedDbRepository } from "../query"

const activeSaves = new Map<string, Promise<unknown>>()
let saveQueue: Promise<void> = Promise.resolve()

export function runIndexedDbAtomicSave<T>(
  saveKey: string,
  repositories: readonly IndexedDbRepository<any>[],
  operation: (repositories: IndexedDbRepository<any>[]) => Promise<T>
): Promise<T> {
  const activeSave = activeSaves.get(saveKey)
  if (activeSave) return activeSave as Promise<T>

  const executeSave = async () => {
    const accountId = requireCurrentAccountId()
    await migrateBusinessDataToIndexedDb(accountId)
    const database = await openTradgioDatabase()
    const storeNames = [...new Set(repositories.map((repository) => repository.storeName))]
    const transaction = database.transaction(storeNames, "readwrite")
    const completion = transactionToPromise(transaction)

    try {
      const result = await operation(repositories.map((repository) => repository.bind(transaction)))
      await completion
      return result
    } catch (error) {
      try {
        transaction.abort()
      } catch {}
      await completion.catch(() => undefined)
      if (error instanceof DOMException && error.name === "ConstraintError") {
        throw new AppError("CONFLICT", "记录违反账号内唯一约束", { cause: error })
      }
      throw error
    } finally {
      activeSaves.delete(saveKey)
      database.close()
    }
  }

  const savePromise = saveQueue.then(executeSave, executeSave)
  saveQueue = savePromise.then(
    () => undefined,
    () => undefined
  )
  activeSaves.set(saveKey, savePromise)
  return savePromise
}
