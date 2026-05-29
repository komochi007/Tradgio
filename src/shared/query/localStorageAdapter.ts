import { AppError } from "../errors"

export interface Repository<T extends { id: string }> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  create(item: T): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
  query(predicate: (item: T) => boolean): Promise<T[]>
}

export function createLocalStorageRepository<T extends { id: string }>(
  collectionKey: string
): Repository<T> {
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

  return {
    async getAll() {
      return readAll()
    },

    async getById(id: string) {
      const items = readAll()
      return items.find((item) => item.id === id)
    },

    async create(item: T) {
      const items = readAll()
      items.push(item)
      writeAll(items)
      return item
    },

    async update(id: string, patch: Partial<T>) {
      const items = readAll()
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) {
        throw new AppError("NOT_FOUND", `记录不存在: ${id}`)
      }
      items[index] = { ...items[index], ...patch }
      writeAll(items)
      return items[index]
    },

    async remove(id: string) {
      const items = readAll()
      const filtered = items.filter((item) => item.id !== id)
      writeAll(filtered)
    },

    async query(predicate: (item: T) => boolean) {
      const items = readAll()
      return items.filter(predicate)
    },
  }
}
