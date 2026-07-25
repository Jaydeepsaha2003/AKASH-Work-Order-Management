import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { createHash } from 'crypto'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'akash-wom.sqlite')
}

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)
  seedUsers()
  return db
}

export function closeDb(): void {
  if (db) {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    db = null
  }
}

export function hashPassword(pwd: string): string {
  return createHash('sha256').update(pwd).digest('hex')
}

function seedUsers(): void {
  if (!db) return
  const count = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c
  if (count === 0) {
    const insert = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    insert.run('Prahlad', hashPassword('123456'))
    insert.run('jaydeep', hashPassword('123456'))
  }
}
