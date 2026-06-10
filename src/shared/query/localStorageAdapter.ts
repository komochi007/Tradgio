import { AppError } from "../errors"
import { migrateLegacyBusinessData, requireCurrentAccountId } from "../account"

export type AccountOwnedEntity = {
  id: string
  accountId: string
}

export type RepositoryCreateInput<T extends AccountOwnedEntity> = Omit<
  T,
  "accountId"
> & {
  accountId?: string
}

export interface Repository<T extends AccountOwnedEntity> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  create(item: RepositoryCreateInput<T>): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
  query(predicate: (item: T) => boolean): Promise<T[]>
}

export interface LocalTransactionalRepository<T extends AccountOwnedEntity>
  extends Repository<T> {
  replaceAll(items: T[]): Promise<void>
}

export function createLocalStorageRepository<T extends AccountOwnedEntity>(
  collectionKey: string
): LocalTransactionalRepository<T> {
  function readAll(): T[] {
    try {
      const raw = localStorage.getItem(collectionKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function writeAll(items: T[]): void {
    localStorage.setItem(collectionKey, JSON.stringify(items))
  }

  function getAccountId(): string {
    const accountId = requireCurrentAccountId()
    migrateLegacyBusinessData(accountId)
    return accountId
  }

  return {
    async getAll() {
      const accountId = getAccountId()
      return readAll().filter((item) => item.accountId === accountId)
    },

    async getById(id: string) {
      const accountId = getAccountId()
      const items = readAll()
      return items.find((item) => item.id === id && item.accountId === accountId)
    },

    async create(item: RepositoryCreateInput<T>) {
      const accountId = getAccountId()
      const items = readAll()
      const ownedItem = { ...item, accountId } as T
      items.push(ownedItem)
      writeAll(items)
      return ownedItem
    },

    async update(id: string, patch: Partial<T>) {
      const accountId = getAccountId()
      const items = readAll()
      const index = items.findIndex(
        (item) => item.id === id && item.accountId === accountId
      )
      if (index === -1) {
        throw new AppError("NOT_FOUND", `记录不存在: ${id}`)
      }
      items[index] = { ...items[index], ...patch, accountId }
      writeAll(items)
      return items[index]
    },

    async remove(id: string) {
      const accountId = getAccountId()
      const items = readAll()
      const filtered = items.filter(
        (item) => item.id !== id || item.accountId !== accountId
      )
      writeAll(filtered)
    },

    async query(predicate: (item: T) => boolean) {
      const accountId = getAccountId()
      const items = readAll().filter((item) => item.accountId === accountId)
      return items.filter(predicate)
    },

    async replaceAll(items: T[]) {
      const accountId = getAccountId()
      const otherAccounts = readAll().filter(
        (item) => item.accountId !== accountId
      )
      writeAll([
        ...otherAccounts,
        ...items.map((item) => ({ ...item, accountId })),
      ])
    },
  }
}
