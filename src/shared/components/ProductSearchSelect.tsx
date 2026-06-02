import { useState, useRef, useEffect, useCallback } from "react"

export type ProductOption = {
  id: string
  name: string
  spec: string
  unit: string
}

type ProductSearchSelectProps = {
  products: ProductOption[]
  value: string
  placeholder?: string
  error?: string
  onChange: (productId: string, product: ProductOption | null) => void
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
  const selectedProduct = products.find((p) => p.id === value)

  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.spec.toLowerCase().includes(search.toLowerCase())
      )
    : products

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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

      {open && (
        <div className="product-search-select__dropdown">
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
                  {product.spec || "-"} / {product.unit}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
