import { getDb } from './db'
import type { Deduction, DeductionInput, OutstandingRow } from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

export function listDeductions(): Deduction[] {
  return getDb().prepare('SELECT * FROM deductions ORDER BY id ASC').all() as Deduction[]
}

export function saveDeduction(input: DeductionInput): { ok: boolean; message: string; duplicate?: boolean } {
  const db = getDb()
  db.prepare(
    `INSERT INTO deductions
      (fin_year, work_order_no, invoice_no, deduct_date, rec_date, description,
       hse_debit, hse_credit, prs_debit, prs_credit, sd_debit, sd_credit, create_status, wo_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    input.create_status || 'Manual',
    input.wo_name
  )
  return { ok: true, message: 'Deduction record saved successfully.' }
}

export function checkDeductionDuplicate(
  fin_year: string,
  work_order_no: string,
  invoice_no: string
): boolean {
  const row = getDb()
    .prepare(
      'SELECT id FROM deductions WHERE fin_year = ? AND work_order_no = ? AND invoice_no = ?'
    )
    .get(fin_year, work_order_no, invoice_no)
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
     WHERE id = ?`
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
    input.id
  )
  return { ok: true, message: 'Deduction record updated successfully.' }
}

export function deleteDeduction(id: number): { ok: boolean; message: string } {
  getDb().prepare('DELETE FROM deductions WHERE id = ?').run(id)
  return { ok: true, message: 'Row deleted successfully.' }
}

// WO Outstanding: SD / HSE / PRS balance grouped by work order.
export function outstanding(): OutstandingRow[] {
  const rows = getDb()
    .prepare(
      `SELECT work_order_no,
              MAX(wo_name) AS wo_name,
              SUM(sd_debit) - SUM(sd_credit)   AS sd_balance,
              SUM(hse_debit) - SUM(hse_credit) AS hse_balance,
              SUM(prs_debit) - SUM(prs_credit) AS prs_balance
       FROM deductions
       WHERE work_order_no IS NOT NULL AND TRIM(work_order_no) <> ''
       GROUP BY work_order_no
       ORDER BY work_order_no ASC`
    )
    .all() as OutstandingRow[]
  return rows
}
