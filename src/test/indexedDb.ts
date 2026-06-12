import "fake-indexeddb/auto"
import { INDEXED_DB_NAME } from "../shared/persistence"

export function resetTradgioDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(INDEXED_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error("测试数据库重置被阻止"))
  })
}
