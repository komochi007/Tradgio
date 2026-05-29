import { type SelectHTMLAttributes, useId } from "react"

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  helpText?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({
  label,
  helpText,
  error,
  options,
  placeholder,
  id,
  className = "",
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  const selectClasses = [
    "form-field__input",
    "form-field__select",
    error ? "form-field__input--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={selectId} className="form-field__label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={selectClasses}
        aria-invalid={!!error}
        aria-describedby={
          error
            ? `${selectId}-error`
            : helpText
              ? `${selectId}-help`
              : undefined
        }
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && !error && (
        <p id={`${selectId}-help`} className="form-field__help">
          {helpText}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
