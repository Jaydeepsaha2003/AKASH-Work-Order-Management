import { getDb } from './db'
import { getActiveCompanyId } from './company'

export interface WoMaster {
  id: number
  name_of_work: string | null
  job_location: string | null
  work_order_no: string
  wo_date: string | null
  wo_value: number
  executed_value: number
  period_months: number
  site_handover_date: string | null
  on_site: string | null
  remarks: string | null
}

export type WoMasterInput = Omit<WoMaster, 'id'>

type Res = { ok: boolean; message: string }

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function listWoMaster(): WoMaster[] {
  return getDb()
    .prepare(
      `SELECT id, name_of_work, job_location, work_order_no, wo_date, wo_value, executed_value,
              period_months, site_handover_date, on_site, remarks
       FROM wo_master WHERE company_id = ? ORDER BY id ASC`
    )
    .all(getActiveCompanyId()) as WoMaster[]
}

export function createWoMaster(input: WoMasterInput): Res {
  const db = getDb()
  db.prepare(
    `INSERT INTO wo_master
      (company_id, name_of_work, job_location, work_order_no, wo_date, wo_value, executed_value,
       period_months, site_handover_date, on_site, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    getActiveCompanyId(),
    input.name_of_work,
    input.job_location,
    input.work_order_no,
    input.wo_date,
    num(input.wo_value),
    num(input.executed_value),
    num(input.period_months),
    input.site_handover_date,
    input.on_site,
    input.remarks
  )
  return { ok: true, message: 'Work order saved successfully.' }
}

export function updateWoMaster(id: number, input: WoMasterInput): Res {
  getDb()
    .prepare(
      `UPDATE wo_master SET
        name_of_work = ?, job_location = ?, work_order_no = ?, wo_date = ?, wo_value = ?,
        executed_value = ?, period_months = ?, site_handover_date = ?, on_site = ?, remarks = ?,
        updated_at = datetime('now')
       WHERE id = ? AND company_id = ?`
    )
    .run(
      input.name_of_work,
      input.job_location,
      input.work_order_no,
      input.wo_date,
      num(input.wo_value),
      num(input.executed_value),
      num(input.period_months),
      input.site_handover_date,
      input.on_site,
      input.remarks,
      id,
      getActiveCompanyId()
    )
  return { ok: true, message: 'Work order updated successfully.' }
}

export function deleteWoMaster(id: number): Res {
  getDb()
    .prepare('DELETE FROM wo_master WHERE id = ? AND company_id = ?')
    .run(id, getActiveCompanyId())
  return { ok: true, message: 'Work order deleted successfully.' }
}
