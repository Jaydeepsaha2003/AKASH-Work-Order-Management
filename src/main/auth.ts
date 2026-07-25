import { getDb, hashPassword } from './db'
import type { AuthUser } from './types'

export function verifyLogin(username: string, password: string): AuthUser | null {
  const row = getDb()
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string } | undefined
  if (!row) return null
  if (row.password_hash !== hashPassword(password)) return null
  return { id: row.id, username: row.username }
}

export function listUsers(): string[] {
  return (getDb().prepare('SELECT username FROM users ORDER BY username').all() as {
    username: string
  }[]).map((r) => r.username)
}

export function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string
): { ok: boolean; message: string } {
  const db = getDb()
  const row = db
    .prepare('SELECT password_hash FROM users WHERE username = ?')
    .get(username) as { password_hash: string } | undefined
  if (!row) return { ok: false, message: 'User not found.' }
  if (row.password_hash !== hashPassword(oldPassword)) {
    return { ok: false, message: 'Current password is incorrect.' }
  }
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, message: 'New password must be at least 4 characters.' }
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(
    hashPassword(newPassword),
    username
  )
  return { ok: true, message: 'Password changed successfully.' }
}
