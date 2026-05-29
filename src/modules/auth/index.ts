export { AuthProvider, useAuth } from "./application/AuthContext"
export type { AuthStatus } from "./application/AuthContext"
export type { AuthService } from "./domain/AuthService"
export type {
  Account,
  AuthSession,
  AuthState,
  LoginInput,
  RegisterInput,
} from "./domain/types"
export { createLocalStorageAuthAdapter } from "./infrastructure/localStorageAuthAdapter"
