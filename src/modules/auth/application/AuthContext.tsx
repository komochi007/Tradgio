import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AuthService } from "../domain/AuthService"
import type { AuthState, AuthStatus, LoginInput, RegisterInput } from "../domain/types"
import { createLocalStorageAuthAdapter } from "../infrastructure/localStorageAuthAdapter"

interface AuthContextValue extends AuthState {
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function useAuthService(): AuthService {
  return useMemo(() => createLocalStorageAuthAdapter(), [])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useAuthService()
  const [state, setState] = useState<AuthState>({
    status: "idle",
    account: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function restore() {
      setState({ status: "restoring", account: null, error: null })
      try {
        const session = await authService.restoreSession()
        if (cancelled) return
        if (session) {
          setState({
            status: "authenticated",
            account: session.account,
            error: null,
          })
        } else {
          setState({ status: "guest", account: null, error: null })
        }
      } catch {
        if (cancelled) return
        setState({ status: "guest", account: null, error: null })
      }
    }

    restore()
    return () => { cancelled = true }
  }, [authService])

  const login = useCallback(
    async (input: LoginInput) => {
      setState((prev) => ({ ...prev, error: null }))
      try {
        const session = await authService.login(input)
        setState({
          status: "authenticated",
          account: session.account,
          error: null,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "登录失败"
        setState((prev) => ({ ...prev, error: message }))
        throw err
      }
    },
    [authService]
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      setState((prev) => ({ ...prev, error: null }))
      try {
        await authService.register(input)
      } catch (err) {
        const message = err instanceof Error ? err.message : "注册失败"
        setState((prev) => ({ ...prev, error: message }))
        throw err
      }
    },
    [authService]
  )

  const logout = useCallback(async () => {
    await authService.logout()
    setState({ status: "guest", account: null, error: null })
  }, [authService])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}

export type { AuthStatus }
