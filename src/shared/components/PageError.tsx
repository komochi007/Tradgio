import type { ReactNode } from "react"
import { Button } from "./Button"

type PageErrorProps = {
  icon?: ReactNode
  title?: string
  message?: string
  onRetry?: () => void
  primaryAction?: {
    label: string
    onClick: () => void
  }
}

export function PageError({
  icon,
  title = "页面加载失败",
  message = "遇到未知错误，请稍后重试",
  onRetry,
  primaryAction,
}: PageErrorProps) {
  return (
    <div className="page-error">
      {icon ? (
        <div className="page-error__icon">{icon}</div>
      ) : (
        <div className="page-error__icon page-error__icon--default">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
            <path d="M24 14v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="34" r="2" fill="currentColor" />
          </svg>
        </div>
      )}
      <h2 className="page-error__title">{title}</h2>
      <p className="page-error__message">{message}</p>
      <div className="page-error__actions">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            重新加载
          </Button>
        )}
        {primaryAction && (
          <Button variant="secondary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
