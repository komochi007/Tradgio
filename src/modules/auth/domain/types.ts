export type Account = {
  id: string
  username: string
  createdAt: string
}

export type RegisterInput = {
  username: string
  password: string
  confirmPassword: string
}

export type LoginInput = {
  username: string
  password: string
}

export type AuthSession = {
  account: Account
  token: string
  issuedAt: string
}

export type AuthStatus = "idle" | "restoring" | "authenticated" | "guest"

export type AuthState = {
  status: AuthStatus
  account: Account | null
  error: string | null
}
