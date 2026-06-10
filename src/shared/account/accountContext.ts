import { AppError } from "../errors"

const SESSION_KEY = "tradgio_session"

type StoredSession = {
  account?: {
    id?: string
  }
}

export function getCurrentAccountId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    return session.account?.id || null
  } catch {
    return null
  }
}

export function requireCurrentAccountId(): string {
  const accountId = getCurrentAccountId()
  if (!accountId) {
    throw new AppError("UNAUTHORIZED", "当前账号不存在，请重新登录")
  }
  return accountId
}
