import { useEffect, useRef } from "react"

type FormErrorSummaryProps = {
  errors: Record<string, string>
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null)
  const entries = Object.entries(errors).filter(([, msg]) => msg)

  useEffect(() => {
    if (entries.length > 0) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [errors, entries.length])

  if (entries.length === 0) return null

  return (
    <div ref={ref} className="form-error-summary">
      <span className="form-error-summary__icon">⚠</span>
      <span>
        表单中有 <strong>{entries.length}</strong> 个字段需要修正
      </span>
    </div>
  )
}
