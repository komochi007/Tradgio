import { useToast, type Toast } from "./toast"

const typeStyles: Record<Toast["type"], string> = {
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  info: "#2563EB",
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderRadius: 14,
            background: "#fff",
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 12px rgba(16,24,40,0.08), 0 16px 32px rgba(16,24,40,0.08)",
            fontSize: 14,
            lineHeight: "22px",
            color: "#111827",
            animation: "toastSlideIn 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            minWidth: 200,
            maxWidth: 400,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: typeStyles[toast.type],
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
