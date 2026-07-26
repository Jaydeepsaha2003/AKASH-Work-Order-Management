import { getDb } from './db'
import { getActiveCompanyId } from './company'
import { syncWoName } from './workorders'
import type { Deduction, DeductionInput, OutstandingRow } from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function listDeductions(): Deduction[] {
  return getDb()
    .prepare('SELECT * FROM deductions WHERE company_id = ? ORDER BY id ASC')
    .all(getActiveCompanyId()) as Deduction[]
}

export function saveDeduction(input: DeductionInput): { ok: boolean; message: string } {
  const db = getDb()
  const cid = getActiveCompanyId()
  db.prepare(
    `INSERT INTO deductions
      (company_id, fin_year, work_order_no, invoice_no, deduct_date, rec_date, description,
       hse_debit, hse_credit, prs_debit, prs_credit, sd_debit, sd_credit, create_status, wo_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cid,
    input.fin_year,
    input.work_order_no,
    input.invoice_no,
    input.deduct_date,
    input.rec_date,
    input.description,
    num(input.hse_debit),
    num(input.hse_credit),
    num(input.prs_debit),
    num(input.prs_credit),
    num(input.sd_debit),
    num(input.sd_credit),
    input.create_status || 'Manual',
    input.wo_name
  )
  syncWoName(cid, input.work_order_no, input.wo_name)
  return { ok: true, message: 'Deduction record saved successfully.' }
}

export function checkDeductionDuplicate(
  fin_year: string,
  work_order_no: string,
  invoice_no: string
): boolean {
  const row = getDb()
    .prepare(
      'SELECT id FROM deductions WHERE company_id = ? AND fin_year = ? AND work_order_no = ? AND invoice_no = ?'
    )
    .get(getActiveCompanyId(), fin_year, work_order_no, invoice_no)
  return !!row
}

export function updateDeduction(input: DeductionInput): { ok: boolean; message: string } {
  const db = getDb()
  if (!input.id) return { ok: false, message: 'Missing record id.' }
  db.prepare(
    `UPDATE deductions SET
      fin_year = ?, work_order_no = ?, invoice_no = ?, deduct_date = ?, rec_date = ?,
      description = ?, hse_debit = ?, hse_credit = ?, prs_debit = ?, prs_credit = ?,
      sd_debit = ?, sd_credit = ?, create_status = ?, wo_name = ?
     WHERE id = ? AND company_id = ?`
  ).run(
    input.fin_year,
    input.work_order_no,
    input.invoice_no,
    input.deduct_date,
    input.rec_date,
    input.description,
    num(input.hse_debit),
    num(input.hse_credit),
    num(input.prs_debit),
    num(input.prs_credit),
    num(input.sd_debit),
    num(input.sd_credit),
    input.create_status,
    input.wo_name,
    input.id,
    getActiveCompanyId()
  )
  syncWoName(getActiveCompanyId(), input.work_order_no, input.wo_name)
  return { ok: true, message: 'Deduction record updated successfully.' }
}

export function deleteDeduction(id: number): { ok: boolean; message: string } {
  getDb()
    .prepare('DELETE FROM deductions WHERE id = ? AND company_id = ?')
    .run(id, getActiveCompanyId())
  return { ok: true, message: 'Row deleted successfully.' }
}

export function outstanding(): OutstandingRow[] {
  return getDb()
    .prepare(
      `SELECT work_order_no,
              MAX(wo_name) AS wo_name,
              COALESCE(SUM(sd_debit), 0)  AS sd_debit,
              COALESCE(SUM(sd_credit), 0) AS sd_credit,
              COALESCE(SUM(hse_debit), 0)  AS hse_debit,
              COALESCE(SUM(hse_credit), 0) AS hse_credit,
              COALESCE(SUM(prs_debit), 0)  AS prs_debit,
              COALESCE(SUM(prs_credit), 0) AS prs_credit,
              COALESCE(SUM(sd_debit), 0)  - COALESCE(SUM(sd_credit), 0)  AS sd_balance,
              COALESCE(SUM(hse_debit), 0) - COALESCE(SUM(hse_credit), 0) AS hse_balance,
              COALESCE(SUM(prs_debit), 0) - COALESCE(SUM(prs_credit), 0) AS prs_balance
       FROM deductions
       WHERE company_id = ? AND work_order_no IS NOT NULL AND TRIM(work_order_no) <> ''
       GROUP BY work_order_no
       ORDER BY work_order_no ASC`
    )
    .all(getActiveCompanyId()) as OutstandingRow[]
}
