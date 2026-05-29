import type { Account, AuthSession, LoginInput, RegisterInput } from "./types"

export interface AuthService {
  register(input: RegisterInput): Promise<Account>
  login(input: LoginInput): Promise<AuthSession>
  logout(): Promise<void>
  restoreSession(): Promise<AuthSession | null>
  getCurrentAccount(): Promise<Account | null>
}
