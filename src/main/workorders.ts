import { getDb } from './db'
import { getActiveCompanyId } from './company'
import type { WorkOrder, WoCreateInput, WoListItem } from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function upsertWoList(cid: number, work_order_no: string, wo_name: string | null): void {
  const db = getDb()
  const existing = db
    .prepare('SELECT wo_name FROM work_order_list WHERE company_id = ? AND work_order_no = ?')
    .get(cid, work_order_no) as { wo_name: string | null } | undefined
  if (!existing) {
    db.prepare(
      'INSERT INTO work_order_list (company_id, work_order_no, wo_name) VALUES (?, ?, ?)'
    ).run(cid, work_order_no, wo_name || null)
  } else if (wo_name && wo_name !== existing.wo_name) {
    db.prepare(
      'UPDATE work_order_list SET wo_name = ? WHERE company_id = ? AND work_order_no = ?'
    ).run(wo_name, cid, work_order_no)
  }
}

export function listWorkOrders(): WorkOrder[] {
  return getDb()
    .prepare('SELECT * FROM workorders WHERE company_id = ? ORDER BY id ASC')
    .all(getActiveCompanyId()) as WorkOrder[]
}

export function listWoNames(): WoListItem[] {
  return getDb()
    .prepare(
      'SELECT work_order_no, wo_name FROM work_order_list WHERE company_id = ? ORDER BY work_order_no ASC'
    )
    .all(getActiveCompanyId()) as WoListItem[]
}

export function createWorkOrder(input: WoCreateInput): { ok: boolean; message: string } {
  const db = getDb()
  const cid = getActiveCompanyId()
  const dup = db
    .prepare(
      'SELECT id FROM workorders WHERE company_id = ? AND fin_year = ? AND work_order_no = ? AND invoice_no = ?'
    )
    .get(cid, input.fin_year, input.work_order_no, input.invoice_no)
  if (dup) {
    return {
      ok: false,
      message:
        'Duplicate entry found! The combination of Fin Year, Work Order No, and Invoice No already exists.'
    }
  }

  const gross = num(input.gross_value)
  const total = num(input.total_amt)
  const entry = new Date().toISOString().slice(0, 10)

  db.prepare(
    `INSERT INTO workorders
      (company_id, fin_year, entry_date, work_order_no, start_date, end_date, invoice_no, invoice_date,
       gross_value, gst_on_gross, total_amt, wo_status, wo_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created', ?)`
  ).run(
    cid,
    input.fin_year,
    entry,
    input.work_order_no,
    input.start_date,
    input.end_date,
    input.invoice_no,
    input.invoice_date,
    gross,
    total - gross,
    total,
    input.wo_name
  )

  upsertWoList(cid, input.work_order_no, input.wo_name)
  return { ok: true, message: 'Your data has been saved successfully.' }
}

export function updateWorkOrder(
  id: number,
  input: WoCreateInput & { wo_status: string; cancel_remarks: string | null }
): { ok: boolean; message: string } {
  const db = getDb()
  const cid = getActiveCompanyId()
  const gross = num(input.gross_value)
  const total = num(input.total_amt)
  db.prepare(
    `UPDATE workorders SET
      fin_year = ?, start_date = ?, end_date = ?, invoice_no = ?, invoice_date = ?,
      gross_value = ?, gst_on_gross = ?, total_amt = ?, wo_status = ?, cancel_remarks = ?,
      wo_name = ?, updated_at = datetime('now')
     WHERE id = ? AND company_id = ?`
  ).run(
    input.fin_year,
    input.start_date,
    input.end_date,
    input.invoice_no,
    input.invoice_date,
    gross,
    total - gross,
    total,
    input.wo_status,
    input.wo_status.toLowerCase() === 'cancelled' ? input.cancel_remarks : '',
    input.wo_name,
    id,
    cid
  )
  upsertWoList(cid, input.work_order_no, input.wo_name)
  return { ok: true, message: 'The selected work order has been updated successfully.' }
}

export function deleteWorkOrder(id: number): { ok: boolean; message: string } {
  const db = getDb()
  const cid = getActiveCompanyId()
  const row = db
    .prepare('SELECT wo_status, rec_date FROM workorders WHERE id = ? AND company_id = ?')
    .get(id, cid) as { wo_status: string; rec_date: string | null } | undefined
  if (!row) return { ok: false, message: 'Record not found.' }
  const status = (row.wo_status || '').toLowerCase()
  if (!(status === 'created' && !row.rec_date)) {
    return {
      ok: false,
      message: "Only records with WO Status 'Created' and no Rec Date can be deleted."
    }
  }
  db.prepare('DELETE FROM workorders WHERE id = ? AND company_id = ?').run(id, cid)
  return { ok: true, message: 'The work order has been deleted successfully.' }
}
