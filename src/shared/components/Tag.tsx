import type { ReactNode } from "react"

type TagVariant = "default" | "success" | "warning" | "error" | "info"
type TagSize = "small" | "default"

type TagProps = {
  children: ReactNode
  variant?: TagVariant
  size?: TagSize
}

export function Tag({ children, variant = "default", size = "default" }: TagProps) {
  return (
    <span
      className={["tag", `tag--${variant}`, size === "small" ? "tag--small" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  )
}
