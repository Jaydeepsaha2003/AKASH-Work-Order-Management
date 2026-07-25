import { getDb } from './db'

export interface Company {
  id: number
  name: string
  address: string | null
  gstin: string | null
  logo: string | null
}

export interface CompanyInput {
  name: string
  address?: string | null
  gstin?: string | null
  logo?: string | null
}

export function listCompanies(): Company[] {
  return getDb()
    .prepare('SELECT id, name, address, gstin, logo FROM companies ORDER BY name COLLATE NOCASE')
    .all() as Company[]
}

export function getActiveCompanyId(): number {
  const db = getDb()
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = 'active_company_id'")
    .get() as { value: string } | undefined
  const id = row ? parseInt(row.value, 10) : NaN
  if (!isNaN(id)) {
    const exists = db.prepare('SELECT 1 FROM companies WHERE id = ?').get(id)
    if (exists) return id
  }
  // fallback to first company
  const first = db.prepare('SELECT id FROM companies ORDER BY id LIMIT 1').get() as
    | { id: number }
    | undefined
  const fid = first ? first.id : 1
  setActiveCompany(fid)
  return fid
}

export function getActiveCompany(): Company | null {
  const id = getActiveCompanyId()
  return (getDb()
    .prepare('SELECT id, name, address, gstin, logo FROM companies WHERE id = ?')
    .get(id) as Company) ?? null
}

export function setActiveCompany(id: number): { ok: boolean; message: string } {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM companies WHERE id = ?').get(id)
  if (!exists) return { ok: false, message: 'Company not found.' }
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES ('active_company_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(id))
  return { ok: true, message: 'Active company changed.' }
}

export function createCompany(input: CompanyInput): { ok: boolean; message: string; id?: number } {
  if (!input.name || !input.name.trim()) return { ok: false, message: 'Company name is required.' }
  const info = getDb()
    .prepare('INSERT INTO companies (name, address, gstin, logo) VALUES (?, ?, ?, ?)')
    .run(input.name.trim(), input.address || null, input.gstin || null, input.logo || null)
  return { ok: true, message: 'Company created.', id: Number(info.lastInsertRowid) }
}

export function updateCompany(
  id: number,
  input: CompanyInput
): { ok: boolean; message: string } {
  if (!input.name || !input.name.trim()) return { ok: false, message: 'Company name is required.' }
  getDb()
    .prepare('UPDATE companies SET name = ?, address = ?, gstin = ?, logo = ? WHERE id = ?')
    .run(input.name.trim(), input.address || null, input.gstin || null, input.logo || null, id)
  return { ok: true, message: 'Company updated.' }
}

export function deleteCompany(id: number): { ok: boolean; message: string } {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) AS c FROM companies').get() as { c: number }).c
  if (total <= 1) {
    return { ok: false, message: 'Cannot delete the only company. Create another one first.' }
  }
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM workorders WHERE company_id = ?').run(id)
    db.prepare('DELETE FROM deductions WHERE company_id = ?').run(id)
    db.prepare('DELETE FROM work_order_list WHERE company_id = ?').run(id)
    db.prepare('DELETE FROM companies WHERE id = ?').run(id)
  })
  tx()
  // if the deleted company was active, switch to another
  getActiveCompanyId()
  return { ok: true, message: 'Company and its data deleted.' }
}
