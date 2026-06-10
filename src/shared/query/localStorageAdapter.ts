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

export type RepositoryUniqueConstraint<T extends AccountOwnedEntity> = {
  field: keyof T
  label: string
}

export type LocalStorageRepositoryOptions<T extends AccountOwnedEntity> = {
  uniqueConstraints?: RepositoryUniqueConstraint<T>[]
}

export function createLocalStorageRepository<T extends AccountOwnedEntity>(
  collectionKey: string,
  options: LocalStorageRepositoryOptions<T> = {}
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

  function assertUnique(
    items: T[],
    candidate: T,
    accountId: string,
    excludedId?: string
  ): void {
    for (const constraint of options.uniqueConstraints ?? []) {
      const value = candidate[constraint.field]
      const duplicate = items.some(
        (item) =>
          item.accountId === accountId &&
          item.id !== excludedId &&
          item[constraint.field] === value
      )
      if (duplicate) {
        throw new AppError(
          "CONFLICT",
          `${constraint.label}已存在: ${String(value)}`
        )
      }
    }
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
      assertUnique(items, ownedItem, accountId)
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
      const updatedItem = { ...items[index], ...patch, accountId }
      assertUnique(items, updatedItem, accountId, id)
      items[index] = updatedItem
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
