type SkeletonTextProps = {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
  return (
    <div className={`skeleton skeleton--text ${className}`} role="status" aria-label="加载中">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton__line"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  )
}

type SkeletonCardProps = {
  className?: string
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`skeleton skeleton--card ${className}`} role="status" aria-label="加载中">
      <div className="skeleton__block skeleton__block--header" />
      <div className="skeleton__block skeleton__block--body" />
      <div className="skeleton__block skeleton__block--footer" />
    </div>
  )
}

type SkeletonTableProps = {
  rows?: number
  cols?: number
  className?: string
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = "",
}: SkeletonTableProps) {
  return (
    <div className={`skeleton skeleton--table ${className}`} role="status" aria-label="加载中">
      <div className="skeleton__table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton__table-cell" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton__table-row">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="skeleton__table-cell" />
          ))}
        </div>
      ))}
    </div>
  )
}
