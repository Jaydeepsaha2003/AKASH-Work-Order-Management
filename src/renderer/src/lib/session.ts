import type { AuthUser } from './types'

const KEY = 'akash.session'

export function getSession(): AuthUser | null {
  try {
    const s = localStorage.getItem(KEY)
    return s ? (JSON.parse(s) as AuthUser) : null
  } catch {
    return null
  }
}

export function setSession(u: AuthUser): void {
  localStorage.setItem(KEY, JSON.stringify(u))
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
