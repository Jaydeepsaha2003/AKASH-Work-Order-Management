import { app, dialog, shell, BrowserWindow } from 'electron'
import { join, extname, basename } from 'path'
import { mkdirSync, copyFileSync, existsSync, unlinkSync } from 'fs'
import { getDb } from './db'
import { getActiveCompanyId } from './company'

export interface Attachment {
  id: number
  company_id: number
  scope: string
  ref_key: string
  filename: string
  original_name: string | null
  created_at: string
}

type Res = { ok: boolean; message: string }
type FileRef = { filename: string; originalName: string }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// The project's uploads folder (created on demand), alongside the database.
export function uploadsDir(): string {
  const dir = join(app.getPath('userData'), 'uploads')
  mkdirSync(dir, { recursive: true })
  return dir
}

let seq = 0
function uniqueName(original: string): string {
  const ext = extname(original) || '.pdf'
  const base = basename(original, ext)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 40)
  const d = new Date()
  const ts =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  seq = (seq + 1) % 1000
  return `${ts}_${String(seq).padStart(3, '0')}_${base}${ext}`
}

// Let the user pick one or more PDFs; copy them into the uploads folder.
export async function uploadPdfs(
  win: BrowserWindow | null
): Promise<Res & { files?: FileRef[] }> {
  const picked = await dialog.showOpenDialog(win!, {
    title: 'Select PDF file(s) to attach',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections']
  })
  if (picked.canceled || !picked.filePaths.length) {
    return { ok: false, message: 'Upload cancelled.' }
  }
  const dir = uploadsDir()
  const files: FileRef[] = []
  try {
    for (const src of picked.filePaths) {
      const originalName = basename(src)
      const filename = uniqueName(originalName)
      copyFileSync(src, join(dir, filename))
      files.push({ filename, originalName })
    }
  } catch (e) {
    return { ok: false, message: `Upload failed: ${String((e as Error)?.message || e)}` }
  }
  return { ok: true, message: `${files.length} file(s) uploaded.`, files }
}

export function listAttachments(input: { scope: string; refKey: string }): Attachment[] {
  return getDb()
    .prepare(
      'SELECT * FROM attachments WHERE company_id = ? AND scope = ? AND ref_key = ? ORDER BY id ASC'
    )
    .all(getActiveCompanyId(), input.scope, input.refKey) as Attachment[]
}

// All attachments for a scope (used to show a PDF icon on each data row)
export function listAttachmentsByScope(input: { scope: string }): Attachment[] {
  return getDb()
    .prepare('SELECT * FROM attachments WHERE company_id = ? AND scope = ? ORDER BY id ASC')
    .all(getActiveCompanyId(), input.scope) as Attachment[]
}

// Reconcile the stored attachments for a record with the provided list:
// insert new files, delete removed ones (and their files on disk).
export function syncAttachments(input: {
  scope: string
  refKey: string
  files: FileRef[]
}): Res {
  const db = getDb()
  const cid = getActiveCompanyId()
  const desired = new Set(input.files.map((f) => f.filename))
  const existing = db
    .prepare(
      'SELECT id, filename FROM attachments WHERE company_id = ? AND scope = ? AND ref_key = ?'
    )
    .all(cid, input.scope, input.refKey) as { id: number; filename: string }[]
  const existingNames = new Set(existing.map((e) => e.filename))

  const del = db.prepare('DELETE FROM attachments WHERE id = ?')
  const ins = db.prepare(
    'INSERT INTO attachments (company_id, scope, ref_key, filename, original_name) VALUES (?, ?, ?, ?, ?)'
  )
  const tx = db.transaction(() => {
    for (const e of existing) {
      if (!desired.has(e.filename)) {
        del.run(e.id)
        try {
          const p = join(uploadsDir(), e.filename)
          if (existsSync(p)) unlinkSync(p)
        } catch {
          /* ignore */
        }
      }
    }
    for (const f of input.files) {
      if (!existingNames.has(f.filename)) {
        ins.run(cid, input.scope, input.refKey, f.filename, f.originalName)
      }
    }
  })
  tx()
  return { ok: true, message: 'Attachments saved.' }
}

export function openAttachment(input: { filename: string }): Res {
  const p = join(uploadsDir(), input.filename)
  if (!existsSync(p)) return { ok: false, message: 'File not found in uploads folder.' }
  // Open inside the app (Electron's built-in Chromium PDF viewer) so it works
  // regardless of the user's default PDF/browser association.
  try {
    const win = new BrowserWindow({
      width: 1100,
      height: 850,
      title: input.filename,
      autoHideMenuBar: true,
      webPreferences: { plugins: true }
    })
    win.loadFile(p)
    return { ok: true, message: 'Opened.' }
  } catch {
    // fall back to the OS default handler
    shell.openPath(p)
    return { ok: true, message: 'Opened.' }
  }
}
