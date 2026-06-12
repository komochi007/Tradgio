import { AppError } from "../errors"
import { requireCurrentAccountId } from "../account"
import {
  INDEXED_DB_STORES,
  migrateBusinessDataToIndexedDb,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../persistence"
import type { IndexedDbStoreName } from "../persistence"
import type {
  AccountOwnedEntity,
  LocalStorageRepositoryOptions,
  LocalTransactionalRepository,
  RepositoryCreateInput,
} from "./localStorageAdapter"

export interface IndexedDbRepository<
  T extends AccountOwnedEntity,
> extends LocalTransactionalRepository<T> {
  readonly storeName: IndexedDbStoreName
  bind(transaction: IDBTransaction): IndexedDbRepository<T>
}

function mapIndexedDbError(error: unknown): never {
  if (error instanceof DOMException && error.name === "ConstraintError") {
    throw new AppError("CONFLICT", "记录违反账号内唯一约束", { cause: error })
  }
  throw error
}

export function createIndexedDbRepository<T extends AccountOwnedEntity>(
  storeName: IndexedDbStoreName,
  options: LocalStorageRepositoryOptions<T> = {},
  boundTransaction?: IDBTransaction
): IndexedDbRepository<T> {
  async function execute<R>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore, accountId: string) => Promise<R>
  ): Promise<R> {
    const accountId = requireCurrentAccountId()
    if (boundTransaction) {
      return operation(boundTransaction.objectStore(storeName), accountId)
    }

    await migrateBusinessDataToIndexedDb(accountId)
    const database = await openTradgioDatabase()
    const transaction = database.transaction(storeName, mode)
    const completion = transactionToPromise(transaction)
    try {
      const result = await operation(transaction.objectStore(storeName), accountId)
      await completion
      return result
    } catch (error) {
      if (mode === "readwrite") {
        try {
          transaction.abort()
        } catch {}
      }
      await completion.catch(() => undefined)
      return mapIndexedDbError(error)
    } finally {
      database.close()
    }
  }

  function assertUnique(items: T[], candidate: T, accountId: string, excludedId?: string): void {
    for (const constraint of options.uniqueConstraints ?? []) {
      const value = candidate[constraint.field]
      const duplicate = items.some(
        (item) =>
          item.accountId === accountId && item.id !== excludedId && item[constraint.field] === value
      )
      if (duplicate) {
        throw new AppError("CONFLICT", `${constraint.label}已存在: ${String(value)}`)
      }
    }
  }

  const repository: IndexedDbRepository<T> = {
    storeName,

    bind(transaction) {
      return createIndexedDbRepository(storeName, options, transaction)
    },

    async getAll() {
      return execute("readonly", async (store, accountId) => {
        return (await requestToPromise(store.index("byAccount").getAll(accountId))) as T[]
      })
    },

    async getById(id) {
      return execute("readonly", async (store, accountId) => {
        const item = (await requestToPromise(store.get(id))) as T | undefined
        return item?.accountId === accountId ? item : undefined
      })
    },

    async create(item: RepositoryCreateInput<T>) {
      return execute("readwrite", async (store, accountId) => {
        const ownedItem = { ...item, accountId } as T
        if (options.uniqueConstraints?.length) {
          const items = (await requestToPromise(store.index("byAccount").getAll(accountId))) as T[]
          assertUnique(items, ownedItem, accountId)
        }
        await requestToPromise(store.add(ownedItem))
        return ownedItem
      })
    },

    async update(id, patch) {
      return execute("readwrite", async (store, accountId) => {
        const existing = (await requestToPromise(store.get(id))) as T | undefined
        if (!existing || existing.accountId !== accountId) {
          throw new AppError("NOT_FOUND", `记录不存在: ${id}`)
        }
        const updated = { ...existing, ...patch, id, accountId } as T
        if (options.uniqueConstraints?.length) {
          const items = (await requestToPromise(store.index("byAccount").getAll(accountId))) as T[]
          assertUnique(items, updated, accountId, id)
        }
        await requestToPromise(store.put(updated))
        return updated
      })
    },

    async remove(id) {
      return execute("readwrite", async (store, accountId) => {
        const existing = (await requestToPromise(store.get(id))) as T | undefined
        if (existing?.accountId === accountId) {
          await requestToPromise(store.delete(id))
        }
      })
    },

    async query(predicate) {
      const items = await repository.getAll()
      return items.filter(predicate)
    },

    async replaceAll(items) {
      return execute("readwrite", async (store, accountId) => {
        const keys = await requestToPromise(store.index("byAccount").getAllKeys(accountId))
        for (const key of keys) {
          await requestToPromise(store.delete(key))
        }
        for (const item of items) {
          await requestToPromise(store.put({ ...item, accountId }))
        }
      })
    },
  }

  return repository
}

export const indexedDbBusinessStores = INDEXED_DB_STORES
