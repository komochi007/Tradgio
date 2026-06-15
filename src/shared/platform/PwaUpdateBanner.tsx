import { useNavigate } from "react-router-dom"
import { Button } from "../components"
import { usePwaUpdate } from "./pwaUpdateContext"

export function PwaUpdateBanner() {
  const navigate = useNavigate()
  const { state, activationBlock, deferUpdate, activateUpdate } = usePwaUpdate()

  if (
    !state.candidate ||
    !["update-ready", "deferred", "activation-blocked", "activating", "reload-ready"].includes(
      state.phase
    )
  ) {
    return null
  }

  const schemaChanged = state.candidate.nextSchemaVersion !== state.candidate.currentSchemaVersion
  const blockedReason = activationBlock && !activationBlock.allowed ? activationBlock.reason : null

  return (
    <section className="pwa-update" role="status" data-testid="pwa-update-banner">
      <div className="pwa-update__content">
        <strong>{state.phase === "reload-ready" ? "新版本已就绪" : "发现 Tradgio 新版本"}</strong>
        <span>
          {state.candidate.currentAppVersion} → {state.candidate.nextAppVersion}
          {schemaChanged ? `，数据版本 ${state.candidate.nextSchemaVersion}` : ""}
        </span>
        {blockedReason === "UNSAVED_CHANGES" && <span>当前正在编辑，请保存或离开表单后更新。</span>}
        {blockedReason === "BACKUP_REQUIRED" && <span>本次更新需要先完成加密备份。</span>}
        {blockedReason === "SCHEMA_DOWNGRADE" && <span>该版本与当前数据不兼容，已禁止激活。</span>}
      </div>
      <div className="pwa-update__actions">
        {blockedReason === "BACKUP_REQUIRED" && (
          <Button size="small" variant="secondary" onClick={() => navigate("/backup")}>
            前往备份
          </Button>
        )}
        {state.phase !== "reload-ready" && (
          <Button size="small" variant="ghost" onClick={deferUpdate}>
            稍后更新
          </Button>
        )}
        <Button
          size="small"
          loading={state.phase === "activating"}
          onClick={() =>
            state.phase === "reload-ready" ? window.location.reload() : void activateUpdate()
          }
        >
          {state.phase === "reload-ready" ? "刷新使用新版" : "安全更新"}
        </Button>
      </div>
    </section>
  )
}
