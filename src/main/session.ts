import { getDb } from './db'
import { setCurrentUser } from './currentUser'
import type { AuthUser } from './types'

// Persist the logged-in user in the DB (app_settings) so the session survives
// app restarts and auto-updates — reliable even for file:// packaged builds,
// unlike renderer localStorage.
const KEY = 'session_username'

export function setSessionUser(username: string): { ok: boolean; message: string } {
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(KEY, username)
  setCurrentUser(username)
  return { ok: true, message: 'ok' }
}

export function getSessionUser(): AuthUser | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(KEY) as
    | { value: string }
    | undefined
  if (!row) return null
  const u = db.prepare('SELECT id, username FROM users WHERE username = ?').get(row.value) as
    | AuthUser
    | undefined
  if (u) {
    setCurrentUser(u.username)
    return u
  }
  return null
}

export function clearSessionUser(): { ok: boolean; message: string } {
  getDb().prepare('DELETE FROM app_settings WHERE key = ?').run(KEY)
  setCurrentUser('System')
  return { ok: true, message: 'ok' }
}
