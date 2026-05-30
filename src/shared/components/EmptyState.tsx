import type { ReactNode } from "react"
import { Button } from "./Button"

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: "empty" | "error"
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  variant = "empty",
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {primaryAction && (
        <div className="empty-state__action">
          <Button variant="primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        </div>
      )}
    </div>
  )
}
