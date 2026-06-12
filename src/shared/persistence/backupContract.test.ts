import { describe, expect, it } from "vitest"
import {
  BACKUP_CRYPTO,
  BACKUP_FORMAT_VERSION,
  BACKUP_MAGIC,
  BACKUP_STORES,
  buildRestorePreview,
  canTransitionRestore,
  checkBackupCompatibility,
  checkBackupHeaderCompatibility,
  evaluateRestoreCapacity,
  restoreMayWriteDatabase,
} from "./backupContract"
import { INDEXED_DB_SCHEMA_VERSION, INDEXED_DB_STORES } from "./indexeddbSchema"
import type { BackupArchive } from "./backupContract"

function sampleArchive(): BackupArchive {
  const emptyStores = Object.fromEntries(
    BACKUP_STORES.map((store) => [store, []])
  ) as unknown as Record<(typeof BACKUP_STORES)[number], unknown[]>

  return {
    manifest: {
      formatVersion: BACKUP_FORMAT_VERSION,
      applicationVersion: "0.1.0",
      schemaVersion: INDEXED_DB_SCHEMA_VERSION,
      createdAt: "2026-06-12T07:00:00.000Z",
      stores: [
        { store: "accounts", recordCount: 2, serializedBytes: 160, sha256: "accounts-hash" },
        { store: "products", recordCount: 3, serializedBytes: 480, sha256: "products-hash" },
      ],
      attachments: { count: 1, totalBytes: 1024 },
      totals: {
        purchaseAmountMinor: 120_000,
        salesAmountMinor: 80_000,
        quoteAmountMinor: 90_000,
        stockQuantity: 42,
      },
      contentSha256: "content-hash",
    },
    stores: {
      ...emptyStores,
      accounts: [{ id: "account-a" }, { id: "account-b" }],
      products: [{ id: "product-1" }, { id: "product-2" }, { id: "product-3" }],
      attachmentBlobs: [
        {
          id: "attachment-1",
          accountId: "account-a",
          mimeType: "application/pdf",
          size: 1024,
          sha256: "attachment-hash",
          bytesBase64: "AA==",
        },
      ],
    },
  }
}

describe("整机加密备份契约", () => {
  it("覆盖全部 IndexedDB store，活动 session 不属于备份集合", () => {
    expect(new Set(BACKUP_STORES)).toEqual(new Set(Object.values(INDEXED_DB_STORES)))
    expect(BACKUP_STORES).toEqual([...BACKUP_STORES].sort())
    expect(BACKUP_STORES).not.toContain("session")
  })

  it("固定 v1 密钥派生与加密参数", () => {
    expect(BACKUP_CRYPTO).toEqual({
      kdf: "PBKDF2",
      hash: "SHA-256",
      iterations: 600_000,
      saltBytes: 16,
      cipher: "AES-GCM",
      keyLength: 256,
      ivBytes: 12,
      tagLength: 128,
    })
  })

  it("拒绝未知格式版本和更高 schema 版本", () => {
    expect(checkBackupCompatibility(0, 1)).toEqual({
      compatible: false,
      reason: "FORMAT_TOO_OLD",
    })
    expect(checkBackupCompatibility(2, 1)).toEqual({
      compatible: false,
      reason: "FORMAT_TOO_NEW",
    })
    expect(checkBackupCompatibility(1, INDEXED_DB_SCHEMA_VERSION + 1)).toEqual({
      compatible: false,
      reason: "SCHEMA_TOO_NEW",
    })
    expect(checkBackupCompatibility(1, INDEXED_DB_SCHEMA_VERSION)).toEqual({ compatible: true })
  })

  it("拒绝错误 magic 和不属于 v1 的加密参数", () => {
    const header = {
      magic: BACKUP_MAGIC,
      formatVersion: BACKUP_FORMAT_VERSION,
      applicationVersion: "0.1.0",
      schemaVersion: INDEXED_DB_SCHEMA_VERSION,
      createdAt: "2026-06-12T07:00:00.000Z",
      serialization: "json-utf8",
      compression: "gzip",
      kdf: {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: BACKUP_CRYPTO.iterations,
        saltBase64: "AA==",
      },
      cipher: {
        name: "AES-GCM",
        keyLength: 256,
        ivBase64: "AA==",
        tagLength: 128,
      },
    } as const

    expect(checkBackupHeaderCompatibility(header)).toEqual({ compatible: true })
    expect(checkBackupHeaderCompatibility({ ...header, magic: "WRONG" })).toEqual({
      compatible: false,
      reason: "INVALID_MAGIC",
    })
    expect(
      checkBackupHeaderCompatibility({
        ...header,
        kdf: { ...header.kdf, iterations: BACKUP_CRYPTO.iterations - 1 },
      })
    ).toEqual({ compatible: false, reason: "UNSUPPORTED_CRYPTO" })
  })

  it("容量预检在预计使用率达到 85% 前阻断恢复", () => {
    const allowed = evaluateRestoreCapacity({
      usage: 100 * 1024 * 1024,
      quota: 1024 * 1024 * 1024,
      currentDatabaseBytes: 20 * 1024 * 1024,
      incomingArchiveBytes: 30 * 1024 * 1024,
    })
    const blocked = evaluateRestoreCapacity({
      usage: 830 * 1024 * 1024,
      quota: 1024 * 1024 * 1024,
      currentDatabaseBytes: 20 * 1024 * 1024,
      incomingArchiveBytes: 30 * 1024 * 1024,
    })

    expect(allowed.allowed).toBe(true)
    expect(blocked.allowed).toBe(false)
    expect(blocked.projectedUsageRatio).toBeGreaterThanOrEqual(0.85)
  })

  it("错误密码、篡改、版本和容量校验阶段都不允许写数据库", () => {
    for (const phase of [
      "selecting-file",
      "entering-password",
      "decrypting",
      "validating",
      "previewing",
      "confirming",
      "creating-snapshot",
      "verifying",
      "failed",
    ] as const) {
      expect(restoreMayWriteDatabase(phase)).toBe(false)
    }
    expect(restoreMayWriteDatabase("restoring")).toBe(true)
  })

  it("必须完成预览、确认和恢复前快照后才能替换数据库", () => {
    expect(canTransitionRestore("validating", "restoring")).toBe(false)
    expect(canTransitionRestore("previewing", "restoring")).toBe(false)
    expect(canTransitionRestore("confirming", "restoring")).toBe(false)
    expect(canTransitionRestore("creating-snapshot", "restoring")).toBe(true)
    expect(canTransitionRestore("restoring", "verifying")).toBe(true)
    expect(canTransitionRestore("verifying", "completed")).toBe(true)
  })

  it("脱敏双账号样本可生成记录、金额、库存和附件恢复预览", () => {
    const preview = buildRestorePreview(sampleArchive())

    expect(preview.accountCount).toBe(2)
    expect(preview.storeSummaries).toEqual([
      { store: "accounts", recordCount: 2, serializedBytes: 160, sha256: "accounts-hash" },
      { store: "products", recordCount: 3, serializedBytes: 480, sha256: "products-hash" },
    ])
    expect(preview.attachments).toEqual({ count: 1, totalBytes: 1024 })
    expect(preview.totals).toEqual({
      purchaseAmountMinor: 120_000,
      salesAmountMinor: 80_000,
      quoteAmountMinor: 90_000,
      stockQuantity: 42,
    })
  })
})
