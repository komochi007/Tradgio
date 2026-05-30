import { forwardRef, type InputHTMLAttributes, useId } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  helpText?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helpText, error, id, className = "", ...rest },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className="form-field__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          "form-field__input",
          error ? "form-field__input--error" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={!!error}
        aria-describedby={
          error
            ? `${inputId}-error`
            : helpText
              ? `${inputId}-help`
              : undefined
        }
        {...rest}
      />
      {helpText && !error && (
        <p id={`${inputId}-help`} className="form-field__help">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
