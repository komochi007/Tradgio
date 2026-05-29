import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../application/AuthContext"
import { useToast } from "../../../shared/notification"

export function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState("")

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!username.trim()) {
      errors.username = "请输入用户名"
    } else if (username.trim().length < 4 || username.trim().length > 30) {
      errors.username = "用户名长度应为 4-30 个字符"
    }

    if (!password) {
      errors.password = "请输入密码"
    } else if (password.length < 6 || password.length > 30) {
      errors.password = "密码长度应为 6-30 个字符"
    }

    if (!confirmPassword) {
      errors.confirmPassword = "请再次输入密码"
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "两次输入的密码不一致"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGeneralError("")

    if (!validate()) return

    setSubmitting(true)
    try {
      await register({
        username: username.trim(),
        password,
        confirmPassword,
      })
      toast.success("注册成功，请登录")
      navigate("/login", { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "注册失败"
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
          <h1 className="auth-card__title">注册 Tradgio</h1>
          <p className="auth-card__subtitle">创建您的账号</p>
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
              placeholder="4-30 个字符"
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
              placeholder="6-30 个字符"
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="auth-form__field-error">{fieldErrors.password}</p>
            )}
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="confirmPassword">
              确认密码
            </label>
            <input
              id="confirmPassword"
              className={`auth-form__input${fieldErrors.confirmPassword ? " auth-form__input--error" : ""}`}
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }))
              }}
              placeholder="请再次输入密码"
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="auth-form__field-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            className="auth-form__submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "注册中…" : "注册"}
          </button>
        </form>

        <p className="auth-card__footer">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  )
}
