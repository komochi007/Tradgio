import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, SectionCard } from "../../../shared/components"
import { useToast } from "../../../shared/notification"
import { markUpdateBackupCompleted } from "../../../shared/platform/pwaUpdateContext"
import { formatCurrency, formatDateTime, formatFileSize, formatNumber } from "../../../shared/utils"
import { useAuth } from "../../auth"
import {
  backupService,
  type BackupFile,
  type BackupHealth,
  type RestoreInspection,
  type RestoreReport,
} from "../application/backupService"

type FilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: Array<{ description: string; accept: Record<string, string[]> }>
  }) => Promise<{
    createWritable(): Promise<{
      write(data: Blob): Promise<void>
      close(): Promise<void>
    }>
  }>
}

async function saveBlob(blob: Blob, filename: string, description: string, extension: string) {
  const picker = (window as FilePickerWindow).showSaveFilePicker
  const canUseFilePicker = picker && /^\.[A-Za-z0-9]+$/.test(extension)
  if (canUseFilePicker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          { description, accept: { [blob.type || "application/octet-stream"]: [extension] } },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") throw error
    }
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function saveBackupFile(file: BackupFile) {
  const buffer = file.bytes.buffer.slice(
    file.bytes.byteOffset,
    file.bytes.byteOffset + file.bytes.byteLength
  ) as ArrayBuffer
  await saveBlob(
    new Blob([buffer], { type: "application/octet-stream" }),
    file.filename,
    "Tradgio 加密备份",
    ".tradgio-backup"
  )
}

function Preview({ inspection }: { inspection: RestoreInspection }) {
  const preview = inspection.preview
  return (
    <div className="backup-preview">
      <div className="backup-preview__summary">
        <div>
          <span>生成时间</span>
          <strong>{formatDateTime(preview.generatedAt)}</strong>
        </div>
        <div>
          <span>账号</span>
          <strong>{formatNumber(preview.accountCount)} 个</strong>
        </div>
        <div>
          <span>附件</span>
          <strong>
            {preview.attachments.count} 个 / {formatFileSize(preview.attachments.totalBytes)}
          </strong>
        </div>
        <div>
          <span>库存合计</span>
          <strong>{formatNumber(preview.totals.stockQuantity)}</strong>
        </div>
      </div>
      <div className="backup-preview__totals">
        <span>进货 {formatCurrency(preview.totals.purchaseAmountMinor / 100)}</span>
        <span>出货 {formatCurrency(preview.totals.salesAmountMinor / 100)}</span>
        <span>报价 {formatCurrency(preview.totals.quoteAmountMinor / 100)}</span>
      </div>
      <details>
        <summary>查看 15 个数据表记录数</summary>
        <div className="backup-preview__stores">
          {preview.storeSummaries.map((item) => (
            <span key={item.store}>
              {item.store}: {item.recordCount}
            </span>
          ))}
        </div>
      </details>
    </div>
  )
}

function formatPercent(value: number | null) {
  if (value === null) return "未知"
  return `${Math.round(value * 100)}%`
}

function BackupHealthPanel({ health }: { health: BackupHealth | null }) {
  if (!health) {
    return (
      <SectionCard title="备份提醒与存储健康" description="正在读取本机备份与容量状态。">
        <div className="backup-health backup-health--unknown">正在检查...</div>
      </SectionCard>
    )
  }

  const storageUsed =
    health.storage.usage !== null && health.storage.quota !== null
      ? `${formatFileSize(health.storage.usage)} / ${formatFileSize(health.storage.quota)}`
      : "未知"

  return (
    <SectionCard
      title="备份提醒与存储健康"
      description="每周至少备份一次；备份文件请保存在电脑本机之外的第二位置。"
    >
      <div className="backup-health-grid">
        <div className={`backup-health backup-health--${health.reminderLevel}`}>
          <span>备份提醒</span>
          <strong>{health.reminderMessage}</strong>
          <small>
            上次备份：
            {health.lastBackupAt ? formatDateTime(health.lastBackupAt) : "未记录"}
          </small>
        </div>
        <div className={`backup-health backup-health--${health.storage.level}`}>
          <span>存储健康</span>
          <strong>{health.storage.message}</strong>
          <small>
            已用 {storageUsed}，使用率 {formatPercent(health.storage.usageRatio)}
          </small>
        </div>
        <div className="backup-health backup-health--normal">
          <span>变更量</span>
          <strong>
            {formatNumber(health.changedRecordCount)} / {formatNumber(health.totalRecordCount)} 条
          </strong>
          <small>统计上次备份后有更新时间的业务记录，不包含备份密码或附件内容。</small>
        </div>
      </div>
    </SectionCard>
  )
}

export function BackupRestorePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { logout } = useAuth()
  const [backupPassword, setBackupPassword] = useState("")
  const [backupPasswordAgain, setBackupPasswordAgain] = useState("")
  const [passwordAcknowledged, setPasswordAcknowledged] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lastBackup, setLastBackup] = useState<BackupFile | null>(null)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePassword, setRestorePassword] = useState("")
  const [inspection, setInspection] = useState<RestoreInspection | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [restoreConfirmed, setRestoreConfirmed] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [health, setHealth] = useState<BackupHealth | null>(null)

  async function refreshHealth() {
    try {
      setHealth(await backupService.getBackupHealth())
    } catch {
      setHealth(null)
    }
  }

  useEffect(() => {
    void refreshHealth()
  }, [])

  async function handleCreateBackup() {
    if (backupPassword !== backupPasswordAgain) {
      toast.error("两次输入的备份密码不一致")
      return
    }
    if (!passwordAcknowledged) {
      toast.warning("请确认已知晓忘记密码将无法恢复")
      return
    }
    setCreating(true)
    try {
      const backup = await backupService.createBackup(backupPassword)
      await saveBackupFile(backup)
      await backupService.recordBackupCompleted(backup)
      await refreshHealth()
      markUpdateBackupCompleted()
      setLastBackup(backup)
      setBackupPassword("")
      setBackupPasswordAgain("")
      toast.success("加密备份已保存，请至少保留两处副本")
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "备份失败")
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleInspect() {
    if (!restoreFile) {
      toast.warning("请先选择 .tradgio-backup 文件")
      return
    }
    if (!restoreFile.name.endsWith(".tradgio-backup")) {
      toast.error("备份文件扩展名必须为 .tradgio-backup")
      return
    }
    setInspecting(true)
    setInspection(null)
    setRestoreConfirmed(false)
    try {
      const bytes = new Uint8Array(await restoreFile.arrayBuffer())
      const result = await backupService.inspectBackup(bytes, restorePassword)
      setInspection(result)
      toast.success("备份校验通过，请核对恢复预览")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "备份检查失败")
    } finally {
      setInspecting(false)
    }
  }

  async function handleRestore() {
    if (!restoreFile || !inspection || !restoreConfirmed) return
    setRestoring(true)
    try {
      const report = await backupService.restoreBackup({
        inspection,
        password: restorePassword,
        sourceFilename: restoreFile.name,
        downloadSnapshot: saveBackupFile,
      })
      let reportSaved = true
      try {
        await saveRestoreReport(report)
      } catch {
        reportSaved = false
      }
      await logout()
      if (reportSaved) {
        toast.success("整机恢复完成，请重新登录")
      } else {
        toast.warning("整机恢复已完成，但恢复报告未保存，请重新登录")
      }
      navigate("/login", { replace: true })
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "恢复失败")
      }
    } finally {
      setRestoring(false)
    }
  }

  async function saveRestoreReport(report: RestoreReport) {
    const filename = `tradgio-restore-report-${report.completedAt.slice(0, 10)}.json`
    await saveBlob(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
      filename,
      "Tradgio 恢复报告",
      ".json"
    )
  }

  return (
    <div className="backup-page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">数据备份与恢复</h1>
          <p className="backup-page__subtitle">
            备份覆盖全部本地账号、业务数据和附件，不包含当前登录状态。
          </p>
        </div>
      </header>

      <div className="backup-page__grid">
        <BackupHealthPanel health={health} />

        <SectionCard
          title="创建整机加密备份"
          description="使用 AES-256-GCM 加密。密码不会保存，忘记后无法恢复。"
        >
          <div className="backup-form">
            <Input
              label="备份密码"
              type="password"
              value={backupPassword}
              onChange={(event) => setBackupPassword(event.target.value)}
              helpText="至少 12 个字符，建议使用独立的长密码短语。"
            />
            <Input
              label="再次输入密码"
              type="password"
              value={backupPasswordAgain}
              onChange={(event) => setBackupPasswordAgain(event.target.value)}
            />
            <label className="backup-confirm">
              <input
                type="checkbox"
                checked={passwordAcknowledged}
                onChange={(event) => setPasswordAcknowledged(event.target.checked)}
              />
              <span>我已记录此密码，并知晓密码丢失后备份无法恢复。</span>
            </label>
            <Button onClick={handleCreateBackup} loading={creating}>
              生成并保存备份
            </Button>
            {lastBackup && (
              <div className="backup-result">
                最近生成：{lastBackup.filename}，账号 {lastBackup.preview.accountCount} 个，附件{" "}
                {lastBackup.preview.attachments.count} 个。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="从备份整机恢复"
          description="恢复会替换当前浏览器中的全部 Tradgio 账号和数据，不会合并。"
        >
          <div className="backup-form">
            <label className="form-field">
              <span className="form-field__label">备份文件</span>
              <input
                className="backup-file-input"
                type="file"
                accept=".tradgio-backup"
                onChange={(event) => {
                  setRestoreFile(event.target.files?.[0] ?? null)
                  setInspection(null)
                  setRestoreConfirmed(false)
                }}
              />
            </label>
            <Input
              label="备份密码"
              type="password"
              value={restorePassword}
              onChange={(event) => setRestorePassword(event.target.value)}
            />
            <Button variant="secondary" onClick={handleInspect} loading={inspecting}>
              检查备份并预览
            </Button>
            {inspection && <Preview inspection={inspection} />}
            {inspection && (
              <>
                <label className="backup-confirm backup-confirm--danger">
                  <input
                    type="checkbox"
                    checked={restoreConfirmed}
                    onChange={(event) => setRestoreConfirmed(event.target.checked)}
                  />
                  <span>我已核对预览，并确认整机替换全部本地账号和数据。恢复前快照将先保存。</span>
                </label>
                <Button onClick={handleRestore} loading={restoring} disabled={!restoreConfirmed}>
                  保存恢复前快照并恢复
                </Button>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
