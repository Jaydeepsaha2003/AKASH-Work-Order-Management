import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { createHash } from 'crypto'
import {
  SCHEMA_SQL,
  INDEX_SQL,
  WORKORDERS_BODY,
  WO_LIST_BODY
} from './schema'

let db: Database.Database | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'akash-wom.sqlite')
}

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = OFF')
  db.exec(SCHEMA_SQL)
  runMigrations(db)
  db.exec(INDEX_SQL)
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

function hasColumn(d: Database.Database, table: string, col: string): boolean {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return cols.some((c) => c.name === col)
}

// Upgrade v1.0.x (single-company) databases to the multi-company schema.
function runMigrations(d: Database.Database): void {
  // 1) Ensure at least one company exists
  const cnt = (d.prepare('SELECT COUNT(*) AS c FROM companies').get() as { c: number }).c
  if (cnt === 0) {
    d.prepare("INSERT INTO companies (name) VALUES ('My Company')").run()
  }
  const defId = (d.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get() as { id: number })
    .id

  // 2) workorders: add company_id (rebuild to get the composite UNIQUE)
  if (!hasColumn(d, 'workorders', 'company_id')) {
    const insertCols =
      'id, fin_year, entry_date, work_order_no, start_date, end_date, invoice_no, invoice_date, ' +
      'rec_date, gross_value, gst_on_gross, total_amt, wo_status, cancel_remarks, income_tax, ' +
      'gst_2, cem_bags, labour_cess, penalty, land_rent, gst_rent_penalty, round_off, hse, ' +
      'price_deduction, sd_amt, net_amount, wo_name, created_at, updated_at'
    // coalesce timestamps so any legacy NULLs don't trip the NOT NULL columns
    const selectCols = insertCols
      .replace('created_at', "COALESCE(created_at, datetime('now'))")
      .replace('updated_at', "COALESCE(updated_at, datetime('now'))")
    const tx = d.transaction(() => {
      d.exec(`CREATE TABLE workorders_new (${WORKORDERS_BODY})`)
      d.prepare(
        `INSERT INTO workorders_new (${insertCols}, company_id) SELECT ${selectCols}, ? FROM workorders`
      ).run(defId)
      d.exec('DROP TABLE workorders')
      d.exec('ALTER TABLE workorders_new RENAME TO workorders')
    })
    tx()
  }

  // 3) deductions: just add the column + backfill (no rebuild needed)
  if (!hasColumn(d, 'deductions', 'company_id')) {
    d.exec('ALTER TABLE deductions ADD COLUMN company_id INTEGER')
    d.prepare('UPDATE deductions SET company_id = ? WHERE company_id IS NULL').run(defId)
  }

  // 4) work_order_list: rebuild to composite primary key (company_id, work_order_no)
  if (!hasColumn(d, 'work_order_list', 'company_id')) {
    const tx = d.transaction(() => {
      d.exec(`CREATE TABLE work_order_list_new (${WO_LIST_BODY})`)
      d.prepare(
        'INSERT INTO work_order_list_new (work_order_no, wo_name, company_id) SELECT work_order_no, wo_name, ? FROM work_order_list'
      ).run(defId)
      d.exec('DROP TABLE work_order_list')
      d.exec('ALTER TABLE work_order_list_new RENAME TO work_order_list')
    })
    tx()
  }

  // 5) Ensure an active-company setting exists
  const s = d.prepare("SELECT value FROM app_settings WHERE key = 'active_company_id'").get()
  if (!s) {
    d.prepare("INSERT INTO app_settings (key, value) VALUES ('active_company_id', ?)").run(
      String(defId)
    )
  }
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
