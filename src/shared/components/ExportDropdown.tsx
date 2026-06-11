import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"

type ExportDropdownProps = {
  onExport: (format: "print" | "sheet") => void
  loading?: boolean
}

export function ExportDropdown({ onExport, loading }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node
    if (
      wrapperRef.current &&
      !wrapperRef.current.contains(target) &&
      !(target instanceof HTMLElement && target.closest(".export-dropdown__menu"))
    ) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 120),
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  function handleSelect(format: "print" | "sheet") {
    setOpen(false)
    onExport(format)
  }

  return (
    <div className="export-dropdown" ref={wrapperRef}>
      <button
        type="button"
        ref={buttonRef}
        className="button button--ghost button--small"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        导出
      </button>
      {open &&
        createPortal(
          <div
            className="export-dropdown__menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
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
              模板Excel
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
