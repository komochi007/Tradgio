type DraftSaveStatusProps = {
  savedAt: string | null
}

function formatSavedTime(savedAt: string): string {
  const date = new Date(savedAt)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

export function DraftSaveStatus({ savedAt }: DraftSaveStatusProps) {
  return (
    <span className={`draft-save-status${savedAt ? " draft-save-status--saved" : ""}`}>
      <span className="draft-save-status__dot" aria-hidden="true" />
      {savedAt ? `草稿已自动保存 ${formatSavedTime(savedAt)}` : "尚未保存草稿"}
    </span>
  )
}
