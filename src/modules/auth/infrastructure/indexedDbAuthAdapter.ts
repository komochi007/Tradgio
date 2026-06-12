import { AppError } from "../../../shared/errors"
import {
  INDEXED_DB_STORES,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../../../shared/persistence"
import type { LocalAuthAdapter } from "../../../shared/platform"
import { generateId } from "../../../shared/utils"
import { migrateLegacyBusinessData } from "../../../shared/account"
import type { Account, AuthSession, LoginInput, RegisterInput } from "../domain/types"
import { createPasswordVerifier, verifyPassword, type PasswordVerifier } from "./passwordVerifier"

const LEGACY_ACCOUNTS_KEY = "tradgio_accounts"
const LEGACY_PASSWORDS_KEY = "tradgio_passwords"
const SESSION_KEY = "tradgio_session"

type StoredAccount = Account & { normalizedUsername: string }
type StoredCredential = { accountId: string; passwordVerifier: PasswordVerifier }

type IndexedDbAuthAdapterOptions = {
  databaseFactory?: IDBFactory
  crypto?: Crypto
  storage?: Storage
}

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

function toAccount(account: StoredAccount): Account {
  return { id: account.id, username: account.username, createdAt: account.createdAt }
}

function makeToken(cryptoApi: Crypto): string {
  const bytes = cryptoApi.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function createIndexedDbAuthAdapter(
  options: IndexedDbAuthAdapterOptions = {}
): LocalAuthAdapter {
  const databaseFactory = options.databaseFactory ?? indexedDB
  const cryptoApi = options.crypto ?? crypto
  const storage = options.storage ?? localStorage

  async function findStoredAccount(username: string): Promise<StoredAccount | undefined> {
    const database = await openTradgioDatabase(databaseFactory)
    try {
      const transaction = database.transaction(INDEXED_DB_STORES.accounts, "readonly")
      const request = transaction
        .objectStore(INDEXED_DB_STORES.accounts)
        .index("byNormalizedUsername")
        .get(normalizeUsername(username))
      return (await requestToPromise(request)) as StoredAccount | undefined
    } finally {
      database.close()
    }
  }

  async function getStoredAccount(accountId: string): Promise<StoredAccount | undefined> {
    const database = await openTradgioDatabase(databaseFactory)
    try {
      const request = database
        .transaction(INDEXED_DB_STORES.accounts, "readonly")
        .objectStore(INDEXED_DB_STORES.accounts)
        .get(accountId)
      return (await requestToPromise(request)) as StoredAccount | undefined
    } finally {
      database.close()
    }
  }

  async function getCredential(accountId: string): Promise<StoredCredential | undefined> {
    const database = await openTradgioDatabase(databaseFactory)
    try {
      const request = database
        .transaction(INDEXED_DB_STORES.accountCredentials, "readonly")
        .objectStore(INDEXED_DB_STORES.accountCredentials)
        .get(accountId)
      return (await requestToPromise(request)) as StoredCredential | undefined
    } finally {
      database.close()
    }
  }

  async function saveAccountAndCredential(
    account: Account,
    passwordVerifier: PasswordVerifier
  ): Promise<void> {
    const database = await openTradgioDatabase(databaseFactory)
    try {
      const transaction = database.transaction(
        [INDEXED_DB_STORES.accounts, INDEXED_DB_STORES.accountCredentials],
        "readwrite"
      )
      transaction.objectStore(INDEXED_DB_STORES.accounts).add({
        ...account,
        normalizedUsername: normalizeUsername(account.username),
      } satisfies StoredAccount)
      transaction.objectStore(INDEXED_DB_STORES.accountCredentials).add({
        accountId: account.id,
        passwordVerifier,
      } satisfies StoredCredential)
      await transactionToPromise(transaction)
    } catch (error) {
      if (error instanceof DOMException && error.name === "ConstraintError") {
        throw new AppError("CONFLICT", "该用户名已被注册")
      }
      throw error
    } finally {
      database.close()
    }
  }

  async function deleteAccountAndCredential(accountId: string): Promise<void> {
    const database = await openTradgioDatabase(databaseFactory)
    try {
      const transaction = database.transaction(
        [INDEXED_DB_STORES.accounts, INDEXED_DB_STORES.accountCredentials],
        "readwrite"
      )
      transaction.objectStore(INDEXED_DB_STORES.accounts).delete(accountId)
      transaction.objectStore(INDEXED_DB_STORES.accountCredentials).delete(accountId)
      await transactionToPromise(transaction)
    } finally {
      database.close()
    }
  }

  function findLegacyAccount(username: string): Account | undefined {
    return readJson<Account[]>(storage, LEGACY_ACCOUNTS_KEY, []).find(
      (account) => normalizeUsername(account.username) === normalizeUsername(username)
    )
  }

  async function migrateLegacyAccount(account: Account, password: string): Promise<boolean> {
    const passwords = readJson<Record<string, string>>(storage, LEGACY_PASSWORDS_KEY, {})
    if (passwords[account.id] !== password) return false

    const verifier = await createPasswordVerifier(password, cryptoApi)
    await saveAccountAndCredential(account, verifier)

    try {
      delete passwords[account.id]
      if (Object.keys(passwords).length === 0) {
        storage.removeItem(LEGACY_PASSWORDS_KEY)
      } else {
        storage.setItem(LEGACY_PASSWORDS_KEY, JSON.stringify(passwords))
      }
    } catch (error) {
      await deleteAccountAndCredential(account.id)
      throw new AppError("UNKNOWN", "旧密码安全迁移失败，请重试", { cause: error })
    }
    return true
  }

  function writeSession(account: Account | null): AuthSession | null {
    if (!account) {
      storage.removeItem(SESSION_KEY)
      return null
    }
    const session: AuthSession = {
      account,
      token: makeToken(cryptoApi),
      issuedAt: new Date().toISOString(),
    }
    storage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  return {
    async register(input: RegisterInput) {
      const username = input.username.trim()
      if (username.length < 4 || username.length > 30) {
        throw new AppError("VALIDATION_ERROR", "用户名长度应为 4-30 个字符")
      }
      if (input.password.length < 6 || input.password.length > 30) {
        throw new AppError("VALIDATION_ERROR", "密码长度应为 6-30 个字符")
      }
      if (input.password !== input.confirmPassword) {
        throw new AppError("VALIDATION_ERROR", "两次输入的密码不一致")
      }
      if ((await findStoredAccount(username)) || findLegacyAccount(username)) {
        throw new AppError("CONFLICT", "该用户名已被注册")
      }

      const account: Account = {
        id: generateId(),
        username,
        createdAt: new Date().toISOString(),
      }
      const verifier = await createPasswordVerifier(input.password, cryptoApi)
      await saveAccountAndCredential(account, verifier)
      return account
    },

    async login(input: LoginInput) {
      if (!input.username.trim() || !input.password) {
        throw new AppError("VALIDATION_ERROR", "用户名和密码不能为空")
      }

      let storedAccount = await findStoredAccount(input.username)
      if (!storedAccount) {
        const legacyAccount = findLegacyAccount(input.username)
        if (!legacyAccount || !(await migrateLegacyAccount(legacyAccount, input.password))) {
          throw new AppError("VALIDATION_ERROR", "用户名或密码错误")
        }
        storedAccount = await getStoredAccount(legacyAccount.id)
      }
      if (!storedAccount) {
        throw new AppError("VALIDATION_ERROR", "用户名或密码错误")
      }

      const credential = await getCredential(storedAccount.id)
      if (
        !credential ||
        !(await verifyPassword(input.password, credential.passwordVerifier, cryptoApi))
      ) {
        throw new AppError("VALIDATION_ERROR", "用户名或密码错误")
      }

      const account = toAccount(storedAccount)
      const session = writeSession(account)!
      migrateLegacyBusinessData(account.id)
      return session
    },

    async migrateLegacyCredential(password: string) {
      const session = readJson<AuthSession | null>(storage, SESSION_KEY, null)
      if (!session?.account?.id) return false
      if (await getCredential(session.account.id)) return false
      return migrateLegacyAccount(session.account, password)
    },

    async logout() {
      writeSession(null)
    },

    async restoreSession() {
      const session = readJson<AuthSession | null>(storage, SESSION_KEY, null)
      if (!session?.account?.id || !session.token) {
        writeSession(null)
        return null
      }
      const storedAccount = await getStoredAccount(session.account.id)
      if (!storedAccount || !(await getCredential(storedAccount.id))) {
        writeSession(null)
        return null
      }
      const refreshed = writeSession(toAccount(storedAccount))
      migrateLegacyBusinessData(storedAccount.id)
      return refreshed
    },

    async getCurrentAccount() {
      const session = readJson<AuthSession | null>(storage, SESSION_KEY, null)
      if (!session?.account?.id) return null
      const account = await getStoredAccount(session.account.id)
      return account ? toAccount(account) : null
    },
  }
}
