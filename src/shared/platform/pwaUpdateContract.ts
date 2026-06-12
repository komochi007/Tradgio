import type { PlatformErrorCode, PwaUpdateCandidate } from "./types"

export type PwaUpdatePhase =
  | "unsupported"
  | "idle"
  | "checking"
  | "installing"
  | "update-ready"
  | "deferred"
  | "activation-blocked"
  | "activating"
  | "reload-ready"
  | "error"

export type PwaUpdateState = {
  phase: PwaUpdatePhase
  candidate: PwaUpdateCandidate | null
  errorCode: PlatformErrorCode | null
}

export type PwaUpdateAction =
  | { type: "UNSUPPORTED" }
  | { type: "CHECK" }
  | { type: "INSTALLING" }
  | { type: "UPDATE_READY"; candidate: PwaUpdateCandidate }
  | { type: "DEFER" }
  | { type: "BLOCK_ACTIVATION" }
  | { type: "ACTIVATE" }
  | { type: "CONTROLLER_CHANGED" }
  | { type: "ERROR"; errorCode: PlatformErrorCode }
  | { type: "DISMISS" }

export const INITIAL_PWA_UPDATE_STATE: PwaUpdateState = {
  phase: "idle",
  candidate: null,
  errorCode: null,
}

export function reducePwaUpdateState(
  state: PwaUpdateState,
  action: PwaUpdateAction
): PwaUpdateState {
  switch (action.type) {
    case "UNSUPPORTED":
      return { phase: "unsupported", candidate: null, errorCode: null }
    case "CHECK":
      if (state.phase !== "idle" && state.phase !== "error") return state
      return { ...state, phase: "checking", errorCode: null }
    case "INSTALLING":
      if (state.phase !== "checking" && state.phase !== "idle") return state
      return { ...state, phase: "installing", errorCode: null }
    case "UPDATE_READY":
      if (state.phase !== "installing" && state.phase !== "checking") return state
      return { phase: "update-ready", candidate: action.candidate, errorCode: null }
    case "DEFER":
      if (state.phase !== "update-ready" && state.phase !== "activation-blocked") return state
      return { ...state, phase: "deferred" }
    case "BLOCK_ACTIVATION":
      if (state.phase !== "update-ready") return state
      return { ...state, phase: "activation-blocked" }
    case "ACTIVATE":
      if (
        state.phase !== "update-ready" &&
        state.phase !== "activation-blocked" &&
        state.phase !== "deferred"
      )
        return state
      return { ...state, phase: "activating", errorCode: null }
    case "CONTROLLER_CHANGED":
      if (state.phase !== "activating") return state
      return { ...state, phase: "reload-ready", errorCode: null }
    case "ERROR":
      return { ...state, phase: "error", errorCode: action.errorCode }
    case "DISMISS":
      return INITIAL_PWA_UPDATE_STATE
  }
}

export type UpdateActivationContext = {
  hasUnsavedChanges: boolean
  backupCompleted: boolean
}

export type UpdateActivationDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: "UNSAVED_CHANGES" | "BACKUP_REQUIRED" | "SCHEMA_DOWNGRADE"
    }

export function evaluateUpdateActivation(
  candidate: PwaUpdateCandidate,
  context: UpdateActivationContext
): UpdateActivationDecision {
  if (candidate.nextSchemaVersion < candidate.currentSchemaVersion) {
    return { allowed: false, reason: "SCHEMA_DOWNGRADE" }
  }
  if (context.hasUnsavedChanges) {
    return { allowed: false, reason: "UNSAVED_CHANGES" }
  }

  const requiresBackup =
    candidate.risk === "high" || candidate.nextSchemaVersion > candidate.currentSchemaVersion
  if (requiresBackup && !context.backupCompleted) {
    return { allowed: false, reason: "BACKUP_REQUIRED" }
  }

  return { allowed: true }
}

export function shouldReloadAutomatically(): false {
  return false
}
