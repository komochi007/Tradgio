import { STORAGE_KEYS } from "../persistence"
import type { DraftFormKey, DraftRecord } from "./types"

type DraftBucket = Record<string, DraftRecord<unknown>>

function buildDraftId(accountId: string, formKey: DraftFormKey): string {
  return `${accountId}:${formKey}`
}

function readBucket(): DraftBucket {
  const raw = localStorage.getItem(STORAGE_KEYS.drafts)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as DraftBucket
    }
  } catch {
    return {}
  }

  return {}
}

function writeBucket(bucket: DraftBucket) {
  localStorage.setItem(STORAGE_KEYS.drafts, JSON.stringify(bucket))
}

export function getDraft<T>(accountId: string, formKey: DraftFormKey): DraftRecord<T> | null {
  const record = readBucket()[buildDraftId(accountId, formKey)]
  return record ? (record as DraftRecord<T>) : null
}

export function saveDraft<T>(accountId: string, formKey: DraftFormKey, data: T): DraftRecord<T> {
  const record: DraftRecord<T> = {
    accountId,
    formKey,
    data,
    updatedAt: new Date().toISOString(),
  }
  const bucket = readBucket()
  bucket[buildDraftId(accountId, formKey)] = record as DraftRecord<unknown>
  writeBucket(bucket)
  return record
}

export function removeDraft(accountId: string, formKey: DraftFormKey) {
  const bucket = readBucket()
  delete bucket[buildDraftId(accountId, formKey)]
  writeBucket(bucket)
}
