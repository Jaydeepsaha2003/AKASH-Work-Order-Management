import { getDb } from './db'
import { getCurrentUser } from './currentUser'
import { getActiveCompany } from './company'

export interface ActivityRow {
  id: number
  ts: string
  username: string | null
  company_name: string | null
  action: string | null
  entity: string | null
  summary: string | null
}

export function logActivity(action: string, entity: string, summary: string): void {
  try {
    const company = getActiveCompany()
    getDb()
      .prepare(
        'INSERT INTO activity_log (username, company_name, action, entity, summary) VALUES (?, ?, ?, ?, ?)'
      )
      .run(getCurrentUser(), company?.name ?? null, action, entity, summary)
  } catch {
    /* never let logging break an operation */
  }
}

export function listActivity(limit = 500): ActivityRow[] {
  return getDb()
    .prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?')
    .all(limit) as ActivityRow[]
}

export function clearActivity(): { ok: boolean; message: string } {
  getDb().prepare('DELETE FROM activity_log').run()
  return { ok: true, message: 'Activity log cleared.' }
}
