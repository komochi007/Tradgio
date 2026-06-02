import { useState, useRef, useEffect, useCallback } from "react"

type ExportDropdownProps = {
  onExport: (format: "print" | "sheet") => void
  loading?: boolean
}

export function ExportDropdown({ onExport, loading }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  function handleSelect(format: "print" | "sheet") {
    setOpen(false)
    onExport(format)
  }

  return (
    <div className="export-dropdown" ref={wrapperRef}>
      <button
        type="button"
        className="button button--ghost button--sm"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        导出
      </button>
      {open && (
        <div className="export-dropdown__menu">
          <button
            type="button"
            className="export-dropdown__item"
            onClick={() => handleSelect("print")}
          >
            打印版
          </button>
          <button
            type="button"
            className="export-dropdown__item"
            onClick={() => handleSelect("sheet")}
          >
            表格版
          </button>
        </div>
      )}
    </div>
  )
}
