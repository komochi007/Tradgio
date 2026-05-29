import type { ReactNode } from "react"

type SectionCardProps = {
  children: ReactNode
  eyebrow?: string
  title?: string
  description?: string
  interactive?: boolean
  large?: boolean
  className?: string
}

export function SectionCard({
  children,
  eyebrow,
  title,
  description,
  interactive = false,
  large = false,
  className = "",
}: SectionCardProps) {
  const cardClass = [
    "section-card",
    interactive ? "section-card--interactive" : "",
    large ? "section-card--large" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <article className={cardClass}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      {title && <h3 className="section-card__title">{title}</h3>}
      {description && (
        <p className="section-card__description">{description}</p>
      )}
      {children}
    </article>
  )
}
