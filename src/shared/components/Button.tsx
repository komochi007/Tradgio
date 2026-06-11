import { type ButtonHTMLAttributes, type ReactNode } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost"
type ButtonSize = "small" | "default" | "large"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  iconLeft,
  iconRight,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const variantClass = {
    primary: "button--primary",
    secondary: "button--secondary",
    ghost: "button--ghost",
  }[variant]

  const sizeClass = {
    small: "button--small",
    default: "",
    large: "button--large",
  }[size]

  const classes = ["button", variantClass, sizeClass, loading ? "button--loading" : "", className]
    .filter(Boolean)
    .join(" ")

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="button__spinner" />}
      {!loading && iconLeft && <span className="button__icon button__icon--left">{iconLeft}</span>}
      <span className="button__label">{children}</span>
      {!loading && iconRight && (
        <span className="button__icon button__icon--right">{iconRight}</span>
      )}
    </button>
  )
}
