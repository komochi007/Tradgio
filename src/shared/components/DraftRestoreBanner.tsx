import { Button } from "./Button"

type DraftRestoreBannerProps = {
  updatedAt: string
  onRestore: () => void
  onDiscard: () => void
}

export function DraftRestoreBanner({ updatedAt, onRestore, onDiscard }: DraftRestoreBannerProps) {
  const savedAt = new Date(updatedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="draft-banner" role="status">
      <div className="draft-banner__content">
        <span className="draft-banner__title">检测到未完成草稿</span>
        <span className="draft-banner__meta">上次保存：{savedAt}</span>
      </div>
      <div className="draft-banner__actions">
        <Button type="button" variant="secondary" size="small" onClick={onDiscard}>
          丢弃
        </Button>
        <Button type="button" variant="primary" size="small" onClick={onRestore}>
          恢复草稿
        </Button>
      </div>
    </div>
  )
}
