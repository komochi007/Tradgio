import { AppError } from "../errors"
import type { LocalTransactionalRepository } from "../query"

const activeSaves = new Map<string, Promise<unknown>>()
let saveQueue: Promise<void> = Promise.resolve()

export function runLocalAtomicSave<T>(
  saveKey: string,
  repositories: LocalTransactionalRepository<any>[],
  operation: () => Promise<T>
): Promise<T> {
  const activeSave = activeSaves.get(saveKey)
  if (activeSave) {
    return activeSave as Promise<T>
  }

  const executeSave = async () => {
    const snapshots = await Promise.all(
      repositories.map((repository) => repository.getAll())
    )

    try {
      return await operation()
    } catch (error) {
      const rollbackErrors: unknown[] = []

      for (let index = repositories.length - 1; index >= 0; index--) {
        try {
          await repositories[index].replaceAll(snapshots[index])
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError)
        }
      }

      if (rollbackErrors.length > 0) {
        throw new AppError("UNKNOWN", "本地保存失败且数据回滚未完整完成", {
          cause: error,
          rollbackErrors,
        })
      }

      throw error
    } finally {
      activeSaves.delete(saveKey)
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
