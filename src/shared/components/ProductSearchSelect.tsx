import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"

export type ProductOption = {
  id: string
  productCode?: string
  name: string
  spec: string
  material?: string
  unit: string
}

type ProductSearchSelectProps = {
  products: ProductOption[]
  value: string
  placeholder?: string
  error?: string
  onChange: (productId: string, product: ProductOption | null) => void
}

function getProductMeta(product: ProductOption): string {
  return [
    product.productCode,
    product.spec || "-",
    product.material,
    product.unit,
  ].filter(Boolean).join(" / ")
}

export function ProductSearchSelect({
  products,
  value,
  placeholder = "搜索或选择货品",
  error,
  onChange,
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const selectedProduct = products.find((p) => p.id === value)

  const keyword = search.trim().toLowerCase()
  const filtered = keyword
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.spec.toLowerCase().includes(keyword) ||
          (p.productCode ?? "").toLowerCase().includes(keyword) ||
          (p.material ?? "").toLowerCase().includes(keyword)
      )
    : products

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node
    if (
      wrapperRef.current &&
      !wrapperRef.current.contains(target) &&
      !(target instanceof HTMLElement && target.closest(".product-search-select__dropdown"))
    ) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
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

  function handleSelect(product: ProductOption) {
    onChange(product.id, product)
    setSearch("")
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("", null)
    setSearch("")
  }

  function handleSelectedClick() {
    setSearch("")
    setOpen(true)
  }

  const inputClass = [
    "product-search-select__input",
    error ? "product-search-select__input--error" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="product-search-select" ref={wrapperRef}>
      {selectedProduct ? (
        <div
          className="product-search-select__selected"
          onClick={handleSelectedClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleSelectedClick()}
        >
          <span className="product-search-select__selected-name">
            {selectedProduct.name}
          </span>
          <button
            type="button"
            className="product-search-select__clear"
            onClick={handleClear}
            aria-label="清除选择"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          className={inputClass}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && createPortal(
        <div
          className="product-search-select__dropdown"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
          }}
        >
          {filtered.length === 0 ? (
            <div className="product-search-select__empty">未找到匹配的货品</div>
          ) : (
            filtered.map((product) => (
              <div
                key={product.id}
                className="product-search-select__option"
                onClick={() => handleSelect(product)}
                role="option"
                aria-selected={product.id === value}
              >
                <span className="product-search-select__option-name">
                  {product.name}
                </span>
                <span className="product-search-select__option-meta">
                  {getProductMeta(product)}
                </span>
              </div>
            ))
          )}
        </div>
      , document.body)}
    </div>
  )
}
