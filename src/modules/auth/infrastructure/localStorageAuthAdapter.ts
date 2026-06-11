import type { AuthService } from "../domain/AuthService"
import type { Account, AuthSession, LoginInput, RegisterInput } from "../domain/types"
import { AppError } from "../../../shared/errors"
import { generateId } from "../../../shared/utils"
import { migrateLegacyBusinessData } from "../../../shared/account"

const ACCOUNTS_KEY = "tradgio_accounts"
const SESSION_KEY = "tradgio_session"

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function readPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem("tradgio_passwords")
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writePasswords(passwords: Record<string, string>): void {
  localStorage.setItem("tradgio_passwords", JSON.stringify(passwords))
}

function makeToken(): string {
  return `tk-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: AuthSession = JSON.parse(raw)
    if (!session.account?.id || !session.token) return null
    return session
  } catch {
    return null
  }
}

function writeSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function createLocalStorageAuthAdapter(): AuthService {
  return {
    async register(input: RegisterInput) {
      if (input.username.length < 4 || input.username.length > 30) {
        throw new AppError("VALIDATION_ERROR", "用户名长度应为 4-30 个字符")
      }
      if (input.password.length < 6 || input.password.length > 30) {
        throw new AppError("VALIDATION_ERROR", "密码长度应为 6-30 个字符")
      }
      if (input.password !== input.confirmPassword) {
        throw new AppError("VALIDATION_ERROR", "两次输入的密码不一致")
      }

      const accounts = readAccounts()
      const exists = accounts.some((a) => a.username.toLowerCase() === input.username.toLowerCase())
      if (exists) {
        throw new AppError("CONFLICT", "该用户名已被注册")
      }

      const account: Account = {
        id: generateId(),
        username: input.username,
        createdAt: new Date().toISOString(),
      }

      accounts.push(account)
      writeAccounts(accounts)

      const passwords = readPasswords()
      passwords[account.id] = input.password
      writePasswords(passwords)

      return account
    },

    async login(input: LoginInput) {
      if (!input.username || !input.password) {
        throw new AppError("VALIDATION_ERROR", "用户名和密码不能为空")
      }

      const accounts = readAccounts()
      const account = accounts.find(
        (a) => a.username.toLowerCase() === input.username.toLowerCase()
      )
      if (!account) {
        throw new AppError("VALIDATION_ERROR", "用户名或密码错误")
      }

      const passwords = readPasswords()
      if (passwords[account.id] !== input.password) {
        throw new AppError("VALIDATION_ERROR", "用户名或密码错误")
      }

      const session: AuthSession = {
        account,
        token: makeToken(),
        issuedAt: new Date().toISOString(),
      }

      writeSession(session)
      migrateLegacyBusinessData(account.id)
      return session
    },

    async logout() {
      writeSession(null)
    },

    async restoreSession() {
      const session = readSession()
      if (!session) return null

      const accounts = readAccounts()
      const account = accounts.find((a) => a.id === session.account.id)
      if (!account) {
        writeSession(null)
        return null
      }

      const refreshed: AuthSession = {
        ...session,
        account,
        token: makeToken(),
        issuedAt: new Date().toISOString(),
      }
      writeSession(refreshed)
      migrateLegacyBusinessData(account.id)
      return refreshed
    },

    async getCurrentAccount() {
      const session = readSession()
      if (!session) return null

      const accounts = readAccounts()
      return accounts.find((a) => a.id === session.account.id) ?? null
    },
  }
}
