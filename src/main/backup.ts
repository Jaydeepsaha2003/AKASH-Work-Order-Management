import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, rmSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import Database from 'better-sqlite3'
import { getDb, getDbPath, closeDb } from './db'

type Res = { ok: boolean; message: string; path?: string }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`
}

function stampFull(): string {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`
}

// The project's Backup folder (created on demand), alongside the database.
export function backupDir(): string {
  const dir = join(app.getPath('userData'), 'Backup')
  mkdirSync(dir, { recursive: true })
  return dir
}

// Write a consistent snapshot of the DB into the Backup folder. Called on app
// open and close. Synchronous & safe: checkpoint the WAL, then copy the file.
export function autoBackup(reason: 'open' | 'close'): void {
  try {
    const d = getDb()
    d.pragma('wal_checkpoint(TRUNCATE)')
    const dir = backupDir()
    copyFileSync(getDbPath(), join(dir, `akash-wom-${reason}-${stampFull()}.sqlite`))
    // keep only the most recent 30 auto-backups
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('akash-wom-') && f.endsWith('.sqlite'))
      .sort()
    while (files.length > 30) {
      const old = files.shift()
      if (old) {
        try {
          unlinkSync(join(dir, old))
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* backups are best-effort; never block app start/quit */
  }
}

// Save a consistent copy of the SQLite database (includes WAL) to a user-chosen file.
export async function backupDatabase(win: BrowserWindow | null): Promise<Res> {
  const result = await dialog.showSaveDialog(win!, {
    title: 'Save database backup',
    defaultPath: `akash-wom-backup-${stamp()}.sqlite`,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
  })
  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Backup cancelled.' }
  }
  try {
    await getDb().backup(result.filePath)
    return { ok: true, message: 'Backup saved successfully.', path: result.filePath }
  } catch (e) {
    return { ok: false, message: `Backup failed: ${String((e as Error)?.message || e)}` }
  }
}

// Replace the current database with a chosen backup file, then relaunch the app.
export async function restoreDatabase(win: BrowserWindow | null): Promise<Res> {
  const result = await dialog.showOpenDialog(win!, {
    title: 'Select a backup database to restore',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
    properties: ['openFile']
  })
  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, message: 'Restore cancelled.' }
  }
  const src = result.filePaths[0]

  // Validate that the file is a genuine app database
  try {
    const test = new Database(src, { readonly: true, fileMustExist: true })
    const row = test
      .prepare(
        "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('workorders','deductions','users')"
      )
      .get() as { c: number }
    test.close()
    if (row.c < 3) {
      return { ok: false, message: 'That file is not a valid AKASH database backup.' }
    }
  } catch {
    return { ok: false, message: 'Could not read that file as a database.' }
  }

  const dbPath = getDbPath()
  try {
    closeDb()
    copyFileSync(src, dbPath)
    // drop any stale WAL/SHM sidecars from the old database
    for (const ext of ['-wal', '-shm']) {
      const p = dbPath + ext
      if (existsSync(p)) rmSync(p)
    }
  } catch (e) {
    return { ok: false, message: `Restore failed: ${String((e as Error)?.message || e)}` }
  }

  // relaunch so every module reopens the restored database cleanly
  setTimeout(() => {
    app.relaunch()
    app.exit(0)
  }, 900)
  return { ok: true, message: 'Database restored. Restarting the app…' }
}
