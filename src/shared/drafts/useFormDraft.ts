import { useCallback, useEffect, useRef, useState } from "react"
import { getDraft, removeDraft, saveDraft } from "./draftStorage"
import type { DraftFormKey, DraftRecord } from "./types"

type UseFormDraftOptions<T> = {
  accountId?: string | null
  formKey: DraftFormKey
  data: T
  enabled: boolean
  isEmpty: (data: T) => boolean
  onRestore: (data: T) => void
  debounceMs?: number
}

export function useFormDraft<T>({
  accountId,
  formKey,
  data,
  enabled,
  isEmpty,
  onRestore,
  debounceMs = 800,
}: UseFormDraftOptions<T>) {
  const [pendingDraft, setPendingDraft] = useState<DraftRecord<T> | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    readyRef.current = false
    setPendingDraft(null)
    setLastSavedAt(null)

    if (!enabled || !accountId) return

    let cancelled = false
    void getDraft<T>(accountId, formKey).then((draft) => {
      if (cancelled) return
      if (draft && !isEmpty(draft.data)) {
        setPendingDraft(draft)
        setLastSavedAt(draft.updatedAt)
      }
      readyRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [accountId, enabled, formKey, isEmpty])

  useEffect(() => {
    if (!enabled || !accountId || !readyRef.current || pendingDraft) return

    const timer = window.setTimeout(async () => {
      if (isEmpty(data)) {
        await removeDraft(accountId, formKey)
        setLastSavedAt(null)
        return
      }

      const draft = await saveDraft(accountId, formKey, data)
      setLastSavedAt(draft.updatedAt)
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [accountId, data, debounceMs, enabled, formKey, isEmpty, pendingDraft])

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return
    onRestore(pendingDraft.data)
    setPendingDraft(null)
    setLastSavedAt(pendingDraft.updatedAt)
  }, [onRestore, pendingDraft])

  const discardDraft = useCallback(async () => {
    if (!accountId) return
    await removeDraft(accountId, formKey)
    setPendingDraft(null)
    setLastSavedAt(null)
  }, [accountId, formKey])

  const clearDraft = useCallback(async () => {
    if (!accountId) return
    await removeDraft(accountId, formKey)
    setPendingDraft(null)
    setLastSavedAt(null)
  }, [accountId, formKey])

  const saveDraftNow = useCallback(async () => {
    if (!enabled || !accountId || isEmpty(data)) return false
    const draft = await saveDraft(accountId, formKey, data)
    setPendingDraft(null)
    setLastSavedAt(draft.updatedAt)
    return true
  }, [accountId, data, enabled, formKey, isEmpty])

  return {
    pendingDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    saveDraftNow,
  }
}
