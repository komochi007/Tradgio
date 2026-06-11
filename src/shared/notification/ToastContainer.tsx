import { useToast } from "./toast"

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} role="alert" className={`toast toast--${toast.type}`}>
          <span className="toast__dot" />
          <span className="toast__message">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="toast__close" aria-label="关闭">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
