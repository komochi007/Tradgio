import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkAttachmentStorageCapacity,
  createContractRecord,
  deleteContractRecord,
  downloadAttachment,
  listContractRecords,
  removeAttachment,
} from "./application/contractService"
import { validateFile } from "./domain/types"
import { contractRepository } from "./infrastructure/contractRepository"
import { CONTRACT_ATTACHMENT_MIGRATION_ID } from "./infrastructure/legacyAttachmentMigration"
import { counterpartyRepository } from "../master-data/counterparties"
import {
  INDEXED_DB_STORES,
  STORAGE_KEYS,
  openTradgioDatabase,
  requestToPromise,
  transactionToPromise,
} from "../../shared/persistence"
import { resetTradgioDatabase } from "../../test/indexedDb"

const SESSION_KEY = "tradgio_session"

class MemoryStorage implements Storage {
  private data = new Map<string, string>()

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

const storage = new MemoryStorage()

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
})

function switchAccount(accountId: string): void {
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      account: { id: accountId, username: accountId, createdAt: "2026-06-15T00:00:00.000Z" },
      token: `${accountId}-token`,
      issuedAt: "2026-06-15T00:00:00.000Z",
    })
  )
}

async function seedCustomer(accountId = "account-a"): Promise<void> {
  switchAccount(accountId)
  await counterpartyRepository.create({
    id: `${accountId}-customer`,
    name: "测试客户",
    type: "customer",
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
    status: "active",
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  })
}

function contractForm(accountId = "account-a") {
  return {
    contractNo: "",
    title: "附件测试合同",
    customerId: `${accountId}-customer`,
    customerName: "测试客户",
    signDate: "2026-06-15",
    remark: "",
  }
}

async function readStore<T>(storeName: string): Promise<T[]> {
  const database = await openTradgioDatabase()
  const transaction = database.transaction(storeName, "readonly")
  const records = (await requestToPromise(transaction.objectStore(storeName).getAll())) as T[]
  await transactionToPromise(transaction)
  database.close()
  return records
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await resetTradgioDatabase()
  storage.clear()
  await seedCustomer()
})

describe("合同附件 IndexedDB Blob", () => {
  it("合法附件可保存、下载并从合同记录移除", async () => {
    const file = new File(["contract-content"], "contract.pdf", { type: "application/pdf" })
    const contract = await createContractRecord(contractForm(), [file])
    const attachment = contract.attachments[0]

    expect(attachment).toMatchObject({ fileName: "contract.pdf", fileSize: file.size })
    expect("dataUrl" in attachment).toBe(false)
    expect(await (await downloadAttachment(attachment.attachmentId)).text()).toBe(
      "contract-content"
    )

    const updated = await removeAttachment(contract.id, attachment.attachmentId)
    expect(updated.attachments).toEqual([])
    await expect(downloadAttachment(attachment.attachmentId)).rejects.toThrow("附件不存在")
    expect(await readStore(INDEXED_DB_STORES.attachmentMetadata)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentBlobs)).toEqual([])
  })

  it("其他账号不能下载或删除附件", async () => {
    const contract = await createContractRecord(contractForm(), [
      new File(["secret"], "secret.pdf", { type: "application/pdf" }),
    ])
    const attachmentId = contract.attachments[0].attachmentId

    switchAccount("account-b")
    await expect(downloadAttachment(attachmentId)).rejects.toThrow("附件不存在")
    await expect(removeAttachment(contract.id, attachmentId)).rejects.toThrow("合同记录不存在")
  })

  it("合同写入失败时元数据与 Blob 一并回滚", async () => {
    const originalBind = contractRepository.bind.bind(contractRepository)
    vi.spyOn(contractRepository, "bind").mockImplementationOnce((transaction) => {
      const bound = originalBind(transaction)
      return {
        ...bound,
        create: async () => {
          throw new Error("注入合同写入失败")
        },
      }
    })

    await expect(
      createContractRecord(contractForm(), [
        new File(["rollback"], "rollback.pdf", { type: "application/pdf" }),
      ])
    ).rejects.toThrow("注入合同写入失败")
    expect(await readStore(INDEXED_DB_STORES.contracts)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentMetadata)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentBlobs)).toEqual([])
  })

  it("删除合同不会留下孤儿附件", async () => {
    const contract = await createContractRecord(contractForm(), [
      new File(["one"], "one.pdf", { type: "application/pdf" }),
      new File(["two"], "two.png", { type: "image/png" }),
    ])
    await deleteContractRecord(contract.id)

    expect(await readStore(INDEXED_DB_STORES.contracts)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentMetadata)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentBlobs)).toEqual([])
  })

  it("Base64 旧附件幂等迁移且保留 localStorage 来源", async () => {
    await resetTradgioDatabase()
    storage.clear()
    switchAccount("account-a")
    const legacyContracts = [
      {
        id: "legacy-contract",
        accountId: "account-a",
        contractNo: "HT260601",
        title: "旧合同",
        customerId: "customer-a",
        customerName: "旧客户",
        signDate: "2026-06-01",
        remark: "",
        attachments: [
          {
            id: "legacy-attachment",
            fileName: "legacy.pdf",
            mimeType: "application/pdf",
            fileSize: 5,
            dataUrl: "data:application/pdf;base64,aGVsbG8=",
            uploadedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]
    storage.setItem(STORAGE_KEYS.data.contracts, JSON.stringify(legacyContracts))

    const first = await listContractRecords()
    const second = await listContractRecords()
    expect(first).toEqual(second)
    expect(first[0].attachments[0]).toEqual(
      expect.objectContaining({ attachmentId: "legacy-attachment", fileName: "legacy.pdf" })
    )
    expect("dataUrl" in first[0].attachments[0]).toBe(false)
    expect(await (await downloadAttachment("legacy-attachment")).text()).toBe("hello")
    expect(storage.getItem(STORAGE_KEYS.data.contracts)).toBe(JSON.stringify(legacyContracts))
    expect(await readStore(INDEXED_DB_STORES.attachmentMetadata)).toHaveLength(1)
    expect(await readStore(INDEXED_DB_STORES.attachmentBlobs)).toHaveLength(1)
    expect(await readStore<{ id: string }>(INDEXED_DB_STORES.migrationRecords)).toContainEqual(
      expect.objectContaining({ id: CONTRACT_ATTACHMENT_MIGRATION_ID })
    )
  })

  it("Base64 迁移失败时保留旧合同且不留半迁移记录", async () => {
    await resetTradgioDatabase()
    storage.clear()
    switchAccount("account-a")
    storage.setItem(
      STORAGE_KEYS.data.contracts,
      JSON.stringify([
        {
          id: "broken-contract",
          accountId: "account-a",
          contractNo: "HT260601",
          title: "损坏合同",
          customerId: "customer-a",
          customerName: "旧客户",
          signDate: "2026-06-01",
          remark: "",
          attachments: [
            {
              id: "broken-attachment",
              fileName: "broken.pdf",
              mimeType: "application/pdf",
              fileSize: 99,
              dataUrl: "data:application/pdf;base64,aGVsbG8=",
              uploadedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ])
    )

    await expect(listContractRecords()).rejects.toThrow("旧附件大小校验失败")
    const contracts = await readStore<Array<{ attachments: Array<{ dataUrl?: string }> }>[number]>(
      INDEXED_DB_STORES.contracts
    )
    expect(contracts[0].attachments[0].dataUrl).toBeDefined()
    expect(await readStore(INDEXED_DB_STORES.attachmentMetadata)).toEqual([])
    expect(await readStore(INDEXED_DB_STORES.attachmentBlobs)).toEqual([])
    expect(
      (await readStore<{ id: string }>(INDEXED_DB_STORES.migrationRecords)).some(
        (record) => record.id === CONTRACT_ATTACHMENT_MIGRATION_ID
      )
    ).toBe(false)
  })

  it("容量达到 70% 时提醒，达到 85% 时阻止", async () => {
    const file = new File([new Uint8Array(10)], "capacity.pdf", { type: "application/pdf" })
    const warning = await checkAttachmentStorageCapacity(file ? [file] : [], {
      estimate: async () => ({ usage: 65, quota: 100 }),
    })
    expect(warning.level).toBe("warning")

    await expect(
      checkAttachmentStorageCapacity([file], {
        estimate: async () => ({ usage: 80, quota: 100 }),
      })
    ).rejects.toThrow("达到 85%")

    const unknown = await checkAttachmentStorageCapacity([file], {
      estimate: async () => {
        throw new Error("容量接口不可用")
      },
    })
    expect(unknown.level).toBe("unknown")
    expect(unknown.message).toContain("无法提供可靠容量信息")
  })

  it("支持规定格式并严格执行 20 MB 单文件边界", () => {
    for (const [name, type] of [
      ["a.pdf", "application/pdf"],
      ["a.jpg", "image/jpeg"],
      ["a.png", "image/png"],
      ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ]) {
      expect(validateFile(new File(["ok"], name, { type }))).toBeNull()
    }
    expect(
      validateFile(
        new File([new Uint8Array(20 * 1024 * 1024)], "limit.pdf", { type: "application/pdf" })
      )
    ).toBeNull()
    expect(
      validateFile(
        new File([new Uint8Array(20 * 1024 * 1024 + 1)], "too-large.pdf", {
          type: "application/pdf",
        })
      )
    ).toContain("20MB")
    expect(validateFile(new File(["bad"], "bad.txt", { type: "text/plain" }))).toContain("仅支持")
  })
})
