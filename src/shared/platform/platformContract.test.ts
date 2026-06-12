import { describe, expect, it } from "vitest"
import { checkRuntimeCompatibility, createRuntimeConfig } from "./runtimeConfig"
import {
  INITIAL_PWA_UPDATE_STATE,
  evaluateUpdateActivation,
  reducePwaUpdateState,
  shouldReloadAutomatically,
} from "./pwaUpdateContract"
import { replacePlatformAdapter } from "./registry"
import { createPlatformAdapterTestRegistry, createPwaUpdateTestDouble } from "./testDoubles"
import { mapPlatformError } from "./errors"
import type { AdapterCall } from "./testDoubles"
import type { PwaUpdateCandidate } from "./types"

const normalUpdate: PwaUpdateCandidate = {
  currentAppVersion: "0.1.0",
  nextAppVersion: "0.1.1",
  currentSchemaVersion: 1,
  nextSchemaVersion: 1,
  risk: "normal",
}

describe("本地 Adapter 与 PWA 更新契约", () => {
  it("生产运行配置要求固定 HTTPS Origin 和同源 Service Worker 路径", () => {
    expect(() =>
      createRuntimeConfig({
        environment: "production",
        appVersion: "1.0.0",
        schemaVersion: 1,
        currentOrigin: "https://app.example.com",
        serviceWorkerPath: "/sw.js",
      })
    ).toThrow("固定 HTTPS Origin")

    expect(() =>
      createRuntimeConfig({
        environment: "production",
        appVersion: "1.0.0",
        schemaVersion: 1,
        expectedOrigin: "http://example.com",
        currentOrigin: "http://example.com",
        serviceWorkerPath: "/sw.js",
      })
    ).toThrow("HTTPS")

    expect(() =>
      createRuntimeConfig({
        environment: "production",
        appVersion: "1.0.0",
        schemaVersion: 1,
        expectedOrigin: "https://app.example.com/path",
        currentOrigin: "https://app.example.com",
        serviceWorkerPath: "/sw.js",
      })
    ).toThrow("不能包含路径")

    expect(() =>
      createRuntimeConfig({
        environment: "production",
        appVersion: "1.0.0",
        schemaVersion: 1,
        expectedOrigin: "https://app.example.com",
        currentOrigin: "https://app.example.com",
        serviceWorkerPath: "//evil.example/sw.js",
      })
    ).toThrow("同源绝对路径")
  })

  it("Origin 不匹配、数据库缺失、待迁移或版本过新时阻止写入", () => {
    const config = createRuntimeConfig({
      environment: "production",
      appVersion: "1.0.0",
      schemaVersion: 1,
      expectedOrigin: "https://app.example.com",
      currentOrigin: "https://preview.example.com",
      serviceWorkerPath: "/sw.js",
    })

    expect(checkRuntimeCompatibility(config, 1)).toEqual({
      writable: false,
      reason: "ORIGIN_MISMATCH",
    })
    expect(
      checkRuntimeCompatibility({ ...config, currentOrigin: config.expectedOrigin }, null)
    ).toEqual({ writable: false, reason: "DATABASE_VERSION_MISSING" })
    expect(
      checkRuntimeCompatibility({ ...config, currentOrigin: config.expectedOrigin }, 2)
    ).toEqual({ writable: false, reason: "DATABASE_VERSION_TOO_NEW" })
    expect(
      checkRuntimeCompatibility(
        { ...config, currentOrigin: config.expectedOrigin, schemaVersion: 2 },
        1
      )
    ).toEqual({ writable: false, reason: "DATABASE_MIGRATION_REQUIRED" })
  })

  it("普通更新仅在无未保存内容时允许显式激活", () => {
    expect(
      evaluateUpdateActivation(normalUpdate, {
        hasUnsavedChanges: true,
        backupCompleted: false,
      })
    ).toEqual({ allowed: false, reason: "UNSAVED_CHANGES" })
    expect(
      evaluateUpdateActivation(normalUpdate, {
        hasUnsavedChanges: false,
        backupCompleted: false,
      })
    ).toEqual({ allowed: true })
  })

  it("schema 升级或高风险更新必须先完成备份", () => {
    const schemaUpdate = { ...normalUpdate, nextSchemaVersion: 2 }
    expect(
      evaluateUpdateActivation(schemaUpdate, {
        hasUnsavedChanges: false,
        backupCompleted: false,
      })
    ).toEqual({ allowed: false, reason: "BACKUP_REQUIRED" })
    expect(
      evaluateUpdateActivation(schemaUpdate, {
        hasUnsavedChanges: false,
        backupCompleted: true,
      })
    ).toEqual({ allowed: true })
  })

  it("waiting worker 只进入提示状态，不自动刷新页面", () => {
    const checking = reducePwaUpdateState(INITIAL_PWA_UPDATE_STATE, { type: "CHECK" })
    const installing = reducePwaUpdateState(checking, { type: "INSTALLING" })
    const ready = reducePwaUpdateState(installing, {
      type: "UPDATE_READY",
      candidate: normalUpdate,
    })
    const activating = reducePwaUpdateState(ready, { type: "ACTIVATE" })
    const reloadReady = reducePwaUpdateState(activating, { type: "CONTROLLER_CHANGED" })

    expect(ready.phase).toBe("update-ready")
    expect(activating.phase).toBe("activating")
    expect(reloadReady.phase).toBe("reload-ready")
    expect(shouldReloadAutomatically()).toBe(false)
  })

  it("不能绕过 waiting 提示从空闲态直接激活或刷新", () => {
    expect(reducePwaUpdateState(INITIAL_PWA_UPDATE_STATE, { type: "ACTIVATE" })).toEqual(
      INITIAL_PWA_UPDATE_STATE
    )
    expect(reducePwaUpdateState(INITIAL_PWA_UPDATE_STATE, { type: "CONTROLLER_CHANGED" })).toEqual(
      INITIAL_PWA_UPDATE_STATE
    )
  })

  it("稍后更新保留 waiting 候选并允许再次显式激活", () => {
    const installing = reducePwaUpdateState(
      reducePwaUpdateState(INITIAL_PWA_UPDATE_STATE, { type: "CHECK" }),
      { type: "INSTALLING" }
    )
    const ready = reducePwaUpdateState(installing, {
      type: "UPDATE_READY",
      candidate: normalUpdate,
    })
    const deferred = reducePwaUpdateState(ready, { type: "DEFER" })
    const activating = reducePwaUpdateState(deferred, { type: "ACTIVATE" })

    expect(deferred.phase).toBe("deferred")
    expect(deferred.candidate).toEqual(normalUpdate)
    expect(activating.phase).toBe("activating")
  })

  it("schema 降级更新被视为不兼容", () => {
    expect(
      evaluateUpdateActivation(
        { ...normalUpdate, currentSchemaVersion: 2, nextSchemaVersion: 1 },
        { hasUnsavedChanges: false, backupCompleted: true }
      )
    ).toEqual({ allowed: false, reason: "SCHEMA_DOWNGRADE" })
  })

  it("PWA Adapter 测试替身可订阅、取消和记录显式激活", async () => {
    const calls: AdapterCall[] = []
    const adapter = createPwaUpdateTestDouble(calls)
    const events: string[] = []
    const unsubscribe = adapter.subscribe((event) => events.push(event.type))

    adapter.emit({ type: "ready" })
    unsubscribe()
    adapter.emit({ type: "checking" })
    await adapter.activateWaiting()

    expect(events).toEqual(["ready"])
    expect(calls.map((call) => call.method)).toEqual(["subscribe", "activateWaiting"])
  })

  it("Adapter 注册表可按能力替换为测试替身", () => {
    const first = createPwaUpdateTestDouble([])
    const second = createPwaUpdateTestDouble([])
    const registry = createPlatformAdapterTestRegistry({ pwaUpdate: first })
    const replaced = replacePlatformAdapter(registry, "pwaUpdate", second)

    expect(registry.pwaUpdate).toBe(first)
    expect(replaced.pwaUpdate).toBe(second)
  })

  it("已取消的 Adapter 调用在执行副作用前失败", async () => {
    const calls: AdapterCall[] = []
    const adapter = createPwaUpdateTestDouble(calls)
    const controller = new AbortController()
    controller.abort()

    await expect(adapter.check({ signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(calls).toEqual([])
  })

  it("底层浏览器异常在 Adapter 层映射为稳定错误码", () => {
    expect(mapPlatformError(new DOMException("cancelled", "AbortError"), "update").code).toBe(
      "OPERATION_ABORTED"
    )
    expect(
      mapPlatformError(new DOMException("quota", "QuotaExceededError"), "database-write").code
    ).toBe("QUOTA_EXCEEDED")
    expect(
      mapPlatformError(new DOMException("version", "VersionError"), "database-open").code
    ).toBe("DATABASE_VERSION_TOO_NEW")
  })
})
