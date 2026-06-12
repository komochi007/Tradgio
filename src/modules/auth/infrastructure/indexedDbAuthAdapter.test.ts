import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it } from "vitest"
import {
  INDEXED_DB_STORES,
  openTradgioDatabase,
  requestToPromise,
} from "../../../shared/persistence"
import { createIndexedDbAuthAdapter } from "./indexedDbAuthAdapter"
import { createPasswordVerifier, verifyPassword } from "./passwordVerifier"

class MemoryStorage implements Storage {
  protected data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

class RemoveFailingStorage extends MemoryStorage {
  override removeItem(key: string): void {
    if (key === "tradgio_passwords") throw new Error("storage failure")
    super.removeItem(key)
  }
}

let databaseFactory: IDBFactory
let storage: MemoryStorage

async function readStoreRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const database = await openTradgioDatabase(databaseFactory)
  try {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key)
    return (await requestToPromise(request)) as T | undefined
  } finally {
    database.close()
  }
}

beforeEach(() => {
  databaseFactory = new IDBFactory()
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  })
})

describe("本地多账号安全认证", () => {
  it("使用随机盐派生不可逆校验值并拒绝错误密码", async () => {
    const first = await createPasswordVerifier("pass1234")
    const second = await createPasswordVerifier("pass1234")

    expect(first.algorithm).toBe("PBKDF2-SHA-256")
    expect(first.iterations).toBe(600_000)
    expect(first.salt).not.toBe(second.salt)
    expect(first.digest).not.toBe(second.digest)
    expect(JSON.stringify(first)).not.toContain("pass1234")
    await expect(verifyPassword("pass1234", first)).resolves.toBe(true)
    await expect(verifyPassword("wrong-pass", first)).resolves.toBe(false)
  })

  it("注册只把账号和密码校验值写入 IndexedDB", async () => {
    const adapter = createIndexedDbAuthAdapter({ databaseFactory, storage })
    const account = await adapter.register({
      username: "secure-user",
      password: "pass1234",
      confirmPassword: "pass1234",
    })

    const storedAccount = await readStoreRecord<Record<string, unknown>>(
      INDEXED_DB_STORES.accounts,
      account.id
    )
    const credential = await readStoreRecord<Record<string, unknown>>(
      INDEXED_DB_STORES.accountCredentials,
      account.id
    )

    expect(storedAccount).toMatchObject({
      username: "secure-user",
      normalizedUsername: "secure-user",
    })
    expect(JSON.stringify(credential)).not.toContain("pass1234")
    expect(storage.getItem("tradgio_passwords")).toBeNull()
  })

  it("旧账号仅在密码正确后迁移并删除对应明文", async () => {
    storage.setItem(
      "tradgio_accounts",
      JSON.stringify([
        { id: "legacy-a", username: "legacy-a", createdAt: "2026-06-01T00:00:00.000Z" },
        { id: "legacy-b", username: "legacy-b", createdAt: "2026-06-01T00:00:00.000Z" },
      ])
    )
    storage.setItem(
      "tradgio_passwords",
      JSON.stringify({ "legacy-a": "pass1234", "legacy-b": "pass5678" })
    )
    const adapter = createIndexedDbAuthAdapter({ databaseFactory, storage })

    await expect(adapter.login({ username: "legacy-a", password: "wrong-pass" })).rejects.toThrow(
      "用户名或密码错误"
    )
    expect(storage.getItem("tradgio_passwords")).toContain("pass1234")

    await expect(
      adapter.login({ username: "legacy-a", password: "pass1234" })
    ).resolves.toMatchObject({
      account: { id: "legacy-a" },
    })
    expect(storage.getItem("tradgio_passwords")).toBe(JSON.stringify({ "legacy-b": "pass5678" }))
    expect(await readStoreRecord(INDEXED_DB_STORES.accountCredentials, "legacy-a")).toBeDefined()
  })

  it("明文删除失败时回滚 IndexedDB 迁移并保留旧凭据", async () => {
    const failingStorage = new RemoveFailingStorage()
    failingStorage.setItem(
      "tradgio_accounts",
      JSON.stringify([{ id: "legacy", username: "legacy", createdAt: "2026-06-01T00:00:00.000Z" }])
    )
    failingStorage.setItem("tradgio_passwords", JSON.stringify({ legacy: "pass1234" }))
    const adapter = createIndexedDbAuthAdapter({ databaseFactory, storage: failingStorage })

    await expect(adapter.login({ username: "legacy", password: "pass1234" })).rejects.toThrow(
      "旧密码安全迁移失败"
    )
    expect(failingStorage.getItem("tradgio_passwords")).toContain("pass1234")
    expect(await readStoreRecord(INDEXED_DB_STORES.accounts, "legacy")).toBeUndefined()
    expect(await readStoreRecord(INDEXED_DB_STORES.accountCredentials, "legacy")).toBeUndefined()
  })

  it("拒绝重复用户名并可恢复有效会话", async () => {
    const adapter = createIndexedDbAuthAdapter({ databaseFactory, storage })
    await adapter.register({
      username: "Account-A",
      password: "pass1234",
      confirmPassword: "pass1234",
    })
    await expect(
      adapter.register({ username: "account-a", password: "pass5678", confirmPassword: "pass5678" })
    ).rejects.toThrow("该用户名已被注册")

    const session = await adapter.login({ username: "account-a", password: "pass1234" })
    await expect(adapter.restoreSession()).resolves.toMatchObject({
      account: { id: session.account.id },
    })
    await adapter.logout()
    await expect(adapter.restoreSession()).resolves.toBeNull()
  })

  it("两个账号使用独立校验值和会话", async () => {
    const adapter = createIndexedDbAuthAdapter({ databaseFactory, storage })
    const accountA = await adapter.register({
      username: "account-a",
      password: "pass1234",
      confirmPassword: "pass1234",
    })
    const accountB = await adapter.register({
      username: "account-b",
      password: "pass5678",
      confirmPassword: "pass5678",
    })

    await expect(adapter.login({ username: "account-a", password: "pass5678" })).rejects.toThrow(
      "用户名或密码错误"
    )
    expect((await adapter.login({ username: "account-a", password: "pass1234" })).account.id).toBe(
      accountA.id
    )
    expect((await adapter.login({ username: "account-b", password: "pass5678" })).account.id).toBe(
      accountB.id
    )
    expect(accountA.id).not.toBe(accountB.id)
  })
})
