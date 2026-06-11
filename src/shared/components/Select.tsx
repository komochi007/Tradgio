import { Check, ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  label?: string
  helpText?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  id?: string
  name?: string
  value: string
  disabled?: boolean
  className?: string
  onValueChange?: (value: string) => void
}

export function Select({
  label,
  helpText,
  error,
  options,
  placeholder,
  id,
  name,
  value,
  disabled,
  className = "",
  onValueChange,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const listboxId = `${selectId}-listbox`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = options.findIndex((opt) => opt.value === value)
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0)
  const selected = options[selectedIndex]

  const selectClasses = [
    "form-field__input",
    "form-field__select",
    "custom-select__button",
    !selected ? "custom-select__button--placeholder" : "",
    error ? "form-field__input--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [selectedIndex])

  function handleSelect(nextValue: string) {
    onValueChange?.(nextValue)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (open && options[activeIndex]) {
        handleSelect(options[activeIndex].value)
      } else {
        setOpen(true)
      }
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="form-field custom-select" ref={wrapperRef}>
      {label && (
        <label htmlFor={selectId} className="form-field__label">
          {label}
        </label>
      )}
      <button
        type="button"
        id={selectId}
        name={name}
        className={selectClasses}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="custom-select__value">{selected?.label ?? placeholder ?? "请选择"}</span>
        <ChevronDown size={16} strokeWidth={2} className="custom-select__chevron" />
      </button>
      {open && (
        <div
          id={listboxId}
          className="custom-select__menu"
          role="listbox"
          aria-labelledby={selectId}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value
            const isActive = index === activeIndex
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  "custom-select__option",
                  isSelected ? "custom-select__option--selected" : "",
                  isActive ? "custom-select__option--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} strokeWidth={2} />}
              </button>
            )
          })}
        </div>
      )}
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
