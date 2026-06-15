import { mapPlatformError } from "./errors"
import type { PwaUpdateAdapter, PwaUpdateCandidate, PwaUpdateEvent } from "./types"

type BrowserPwaUpdateOptions = {
  serviceWorkerPath: string
  scope: string
  currentAppVersion: string
  currentSchemaVersion: number
}

type WorkerVersion = {
  appVersion: string
  schemaVersion: number
  risk: "normal" | "high"
}

export function createBrowserPwaUpdateAdapter({
  serviceWorkerPath,
  scope,
  currentAppVersion,
  currentSchemaVersion,
}: BrowserPwaUpdateOptions): PwaUpdateAdapter {
  const listeners = new Set<(event: PwaUpdateEvent) => void>()
  let registration: ServiceWorkerRegistration | null = null
  let controllerChangeBound = false

  function emit(event: PwaUpdateEvent) {
    listeners.forEach((listener) => listener(event))
  }

  async function emitWaiting(worker: ServiceWorker) {
    const version = await readWorkerVersion(worker)
    const candidate: PwaUpdateCandidate = {
      currentAppVersion,
      nextAppVersion: version.appVersion,
      currentSchemaVersion,
      nextSchemaVersion: version.schemaVersion,
      risk: version.risk,
    }
    emit({ type: "update-ready", candidate })
  }

  function bindRegistration(nextRegistration: ServiceWorkerRegistration) {
    registration = nextRegistration
    if (!controllerChangeBound) {
      navigator.serviceWorker.addEventListener("controllerchange", () =>
        emit({ type: "activated" })
      )
      controllerChangeBound = true
    }

    nextRegistration.addEventListener("updatefound", () => {
      const worker = nextRegistration.installing
      if (!worker) return
      emit({ type: "installing" })
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          const waiting = nextRegistration.waiting
          if (waiting) void emitWaiting(waiting).catch(handleUpdateError)
        }
      })
    })
  }

  function handleUpdateError(error: unknown) {
    emit({ type: "error", errorCode: mapPlatformError(error, "update").code })
  }

  return {
    async register(options) {
      throwIfAborted(options?.signal)
      if (!("serviceWorker" in navigator)) {
        emit({ type: "unsupported" })
        return
      }
      try {
        emit({ type: "checking" })
        const nextRegistration = await navigator.serviceWorker.register(serviceWorkerPath, {
          scope,
        })
        throwIfAborted(options?.signal)
        bindRegistration(nextRegistration)
        if (nextRegistration.waiting) await emitWaiting(nextRegistration.waiting)
        else emit({ type: "ready" })
      } catch (error) {
        handleUpdateError(error)
      }
    },
    async check(options) {
      throwIfAborted(options?.signal)
      if (!registration) throw mapPlatformError(new Error("Service Worker 尚未注册"), "update")
      emit({ type: "checking" })
      try {
        await registration.update()
        throwIfAborted(options?.signal)
        if (registration.waiting) await emitWaiting(registration.waiting)
        else emit({ type: "ready" })
      } catch (error) {
        handleUpdateError(error)
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async activateWaiting(options) {
      throwIfAborted(options?.signal)
      if (!registration?.waiting) {
        throw mapPlatformError(new Error("没有等待激活的版本"), "update")
      }
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
    },
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("操作已取消", "AbortError")
}

function readWorkerVersion(worker: ServiceWorker): Promise<WorkerVersion> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => reject(new Error("读取更新版本超时")), 5000)
    channel.port1.onmessage = (event: MessageEvent<WorkerVersion>) => {
      window.clearTimeout(timeout)
      resolve(event.data)
    }
    worker.postMessage({ type: "GET_VERSION" }, [channel.port2])
  })
}
