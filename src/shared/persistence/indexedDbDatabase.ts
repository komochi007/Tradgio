import {
  INDEXED_DB_NAME,
  INDEXED_DB_SCHEMA,
  INDEXED_DB_SCHEMA_VERSION,
  type IndexedDbKeyPath,
} from "./indexeddbSchema"

function toKeyPath(keyPath: IndexedDbKeyPath): string | string[] {
  return Array.isArray(keyPath) ? [...keyPath] : (keyPath as string)
}

export function openTradgioDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(INDEXED_DB_NAME, INDEXED_DB_SCHEMA_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      for (const definition of INDEXED_DB_SCHEMA) {
        const store = database.objectStoreNames.contains(definition.name)
          ? request.transaction!.objectStore(definition.name)
          : database.createObjectStore(definition.name, {
              keyPath: toKeyPath(definition.keyPath),
              autoIncrement: definition.autoIncrement,
            })

        for (const index of definition.indexes) {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, toKeyPath(index.keyPath), {
              unique: index.unique,
              multiEntry: index.multiEntry,
            })
          }
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("无法打开本地数据库"))
    request.onblocked = () => reject(new Error("本地数据库升级被其他页面阻止"))
  })
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("本地数据库操作失败"))
  })
}

export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("本地数据库事务失败"))
    transaction.onabort = () => reject(transaction.error ?? new Error("本地数据库事务已中止"))
  })
}
