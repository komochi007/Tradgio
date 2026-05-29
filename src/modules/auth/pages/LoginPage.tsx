import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../application/AuthContext"
import { useToast } from "../../../shared/notification"

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState("")

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!username.trim()) errors.username = "请输入用户名"
    if (!password) errors.password = "请输入密码"
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGeneralError("")

    if (!validate()) return

    setSubmitting(true)
    try {
      await login({ username: username.trim(), password })
      toast.success("登录成功")
      navigate("/overview", { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败"
      setGeneralError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__brand">T</div>
          <h1 className="auth-card__title">登录 Tradgio</h1>
          <p className="auth-card__subtitle">库存管理平台</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {generalError && (
            <div className="auth-form__error-banner">{generalError}</div>
          )}

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              className={`auth-form__input${fieldErrors.username ? " auth-form__input--error" : ""}`}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: "" }))
              }}
              placeholder="请输入用户名"
              autoComplete="username"
              autoFocus
            />
            {fieldErrors.username && (
              <p className="auth-form__field-error">{fieldErrors.username}</p>
            )}
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              className={`auth-form__input${fieldErrors.password ? " auth-form__input--error" : ""}`}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }))
              }}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="auth-form__field-error">{fieldErrors.password}</p>
            )}
          </div>

          <button
            className="auth-form__submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="auth-card__footer">
          还没有账号？<Link to="/register">注册新账号</Link>
        </p>
      </div>
    </div>
  )
}
