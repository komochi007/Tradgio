export const PASSWORD_VERIFIER_CONFIG = {
  algorithm: "PBKDF2-SHA-256",
  version: 1,
  iterations: 600_000,
  saltBytes: 16,
  digestBytes: 32,
} as const

export type PasswordVerifier = {
  algorithm: typeof PASSWORD_VERIFIER_CONFIG.algorithm
  version: number
  iterations: number
  salt: string
  digest: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function deriveDigest(
  password: string,
  salt: Uint8Array,
  iterations: number,
  cryptoApi: Crypto
): Promise<Uint8Array> {
  const saltBuffer = new Uint8Array(salt).buffer
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const bits = await cryptoApi.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations },
    keyMaterial,
    PASSWORD_VERIFIER_CONFIG.digestBytes * 8
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

export async function createPasswordVerifier(
  password: string,
  cryptoApi: Crypto = crypto
): Promise<PasswordVerifier> {
  const salt = cryptoApi.getRandomValues(new Uint8Array(PASSWORD_VERIFIER_CONFIG.saltBytes))
  const digest = await deriveDigest(password, salt, PASSWORD_VERIFIER_CONFIG.iterations, cryptoApi)
  return {
    algorithm: PASSWORD_VERIFIER_CONFIG.algorithm,
    version: PASSWORD_VERIFIER_CONFIG.version,
    iterations: PASSWORD_VERIFIER_CONFIG.iterations,
    salt: bytesToBase64(salt),
    digest: bytesToBase64(digest),
  }
}

export async function verifyPassword(
  password: string,
  verifier: PasswordVerifier,
  cryptoApi: Crypto = crypto
): Promise<boolean> {
  if (
    verifier.algorithm !== PASSWORD_VERIFIER_CONFIG.algorithm ||
    verifier.version !== PASSWORD_VERIFIER_CONFIG.version ||
    verifier.iterations !== PASSWORD_VERIFIER_CONFIG.iterations
  ) {
    throw new Error("密码校验参数版本不兼容")
  }
  const actual = await deriveDigest(
    password,
    base64ToBytes(verifier.salt),
    verifier.iterations,
    cryptoApi
  )
  return timingSafeEqual(actual, base64ToBytes(verifier.digest))
}
