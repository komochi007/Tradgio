import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react"
import { useLocation } from "react-router-dom"
import { INDEXED_DB_SCHEMA_VERSION } from "../persistence"
import { createBrowserPwaUpdateAdapter } from "./browserPwaUpdateAdapter"
import {
  INITIAL_PWA_UPDATE_STATE,
  evaluateUpdateActivation,
  reducePwaUpdateState,
} from "./pwaUpdateContract"
import type { PwaUpdateState, UpdateActivationDecision } from "./pwaUpdateContract"
import type { PwaUpdateEvent } from "./types"

const UPDATE_BACKUP_KEY = "tradgio_update_backup_completed"

type PwaUpdateContextValue = {
  state: PwaUpdateState
  activationBlock: UpdateActivationDecision | null
  deferUpdate(): void
  activateUpdate(): Promise<void>
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null)

export function PwaUpdateProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [state, dispatch] = useReducer(reducePwaUpdateState, INITIAL_PWA_UPDATE_STATE)
  const [activationBlock, setActivationBlock] = useState<UpdateActivationDecision | null>(null)
  const adapter = useMemo(
    () =>
      createBrowserPwaUpdateAdapter({
        serviceWorkerPath:
          import.meta.env.VITE_SERVICE_WORKER_PATH || `${import.meta.env.BASE_URL}sw.js`,
        scope: import.meta.env.BASE_URL,
        currentAppVersion: import.meta.env.VITE_APP_VERSION || "0.1.0",
        currentSchemaVersion: INDEXED_DB_SCHEMA_VERSION,
      }),
    []
  )

  useEffect(() => {
    if (!import.meta.env.PROD) return
    const unsubscribe = adapter.subscribe((event) => handleEvent(event, dispatch))
    void adapter.register()
    return unsubscribe
  }, [adapter])

  const hasUnsavedChanges = isEditingRoute(location.pathname)

  async function activateUpdate() {
    if (!state.candidate) return
    const decision = evaluateUpdateActivation(state.candidate, {
      hasUnsavedChanges,
      backupCompleted: sessionStorage.getItem(UPDATE_BACKUP_KEY) === "true",
    })
    if (!decision.allowed) {
      setActivationBlock(decision)
      dispatch({ type: "BLOCK_ACTIVATION" })
      return
    }

    setActivationBlock(null)
    dispatch({ type: "ACTIVATE" })
    try {
      await adapter.activateWaiting()
    } catch {
      dispatch({ type: "ERROR", errorCode: "UPDATE_ACTIVATION_FAILED" })
    }
  }

  return (
    <PwaUpdateContext.Provider
      value={{
        state,
        activationBlock,
        deferUpdate: () => dispatch({ type: "DEFER" }),
        activateUpdate,
      }}
    >
      {children}
    </PwaUpdateContext.Provider>
  )
}

export function usePwaUpdate() {
  const context = useContext(PwaUpdateContext)
  if (!context) throw new Error("usePwaUpdate 必须在 PwaUpdateProvider 内使用")
  return context
}

export function markUpdateBackupCompleted() {
  sessionStorage.setItem(UPDATE_BACKUP_KEY, "true")
}

function handleEvent(
  event: PwaUpdateEvent,
  dispatch: React.Dispatch<Parameters<typeof reducePwaUpdateState>[1]>
) {
  switch (event.type) {
    case "unsupported":
      dispatch({ type: "UNSUPPORTED" })
      break
    case "checking":
      dispatch({ type: "CHECK" })
      break
    case "installing":
      dispatch({ type: "INSTALLING" })
      break
    case "update-ready":
      dispatch({ type: "UPDATE_READY", candidate: event.candidate })
      break
    case "activated":
      dispatch({ type: "CONTROLLER_CHANGED" })
      break
    case "error":
      dispatch({ type: "ERROR", errorCode: event.errorCode })
      break
    case "ready":
      dispatch({ type: "DISMISS" })
      break
  }
}

function isEditingRoute(pathname: string) {
  return (
    pathname.endsWith("/new") ||
    pathname.endsWith("/edit") ||
    /^\/(products|counterparties)\/[^/]+$/.test(pathname)
  )
}
