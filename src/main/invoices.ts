import { getDb } from './db'
import type { InvoiceInput } from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

// Save invoice deductions for an existing work order (Update Inv "Save").
// Mirrors save_inv_Click: updates the workorder row, marks it "Received",
// and appends an auto-generated deduction ledger entry.
export function saveInvoice(input: InvoiceInput): { ok: boolean; message: string } {
  const db = getDb()
  const wo = db
    .prepare(
      'SELECT id, wo_name FROM workorders WHERE fin_year = ? AND work_order_no = ? AND invoice_no = ?'
    )
    .get(input.fin_year, input.work_order_no, input.invoice_no) as
    | { id: number; wo_name: string | null }
    | undefined

  if (!wo) {
    return {
      ok: false,
      message: 'Matching record not found. Please check Fin Year, Work Order No, and Invoice No.'
    }
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE workorders SET
        rec_date = ?, income_tax = ?, hse = ?, round_off = ?, gst_2 = ?, cem_bags = ?,
        labour_cess = ?, sd_amt = ?, penalty = ?, land_rent = ?, gst_rent_penalty = ?,
        price_deduction = ?, net_amount = ?, total_amt = ?, wo_status = 'Received',
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      input.rec_date,
      num(input.income_tax),
      num(input.hse),
      num(input.round_off),
      num(input.gst_2),
      num(input.cem_bags),
      num(input.labour_cess),
      num(input.sd_amt),
      num(input.penalty),
      num(input.land_rent),
      num(input.gst_rent_penalty),
      num(input.price_deduction),
      num(input.net_amount),
      num(input.total_amt),
      wo.id
    )

    // Auto-generate deduction ledger entry (HSE / PRS / SD debits)
    db.prepare(
      `INSERT INTO deductions
        (fin_year, work_order_no, invoice_no, deduct_date, hse_debit, prs_debit, sd_debit,
         create_status, wo_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Auto-Generate', ?)`
    ).run(
      input.fin_year,
      input.work_order_no,
      input.invoice_no,
      input.rec_date,
      num(input.hse),
      num(input.price_deduction),
      num(input.sd_amt),
      wo.wo_name
    )
  })
  tx()

  return { ok: true, message: "Invoice data saved successfully and logged in 'Deduction' ledger." }
}

// Update an already-received invoice (Edit Mode) without adding a new ledger row.
export function updateInvoice(input: InvoiceInput): { ok: boolean; message: string } {
  const db = getDb()
  const wo = db
    .prepare(
      'SELECT id FROM workorders WHERE fin_year = ? AND work_order_no = ? AND invoice_no = ?'
    )
    .get(input.fin_year, input.work_order_no, input.invoice_no) as { id: number } | undefined
  if (!wo) return { ok: false, message: 'No matching record found to update.' }

  db.prepare(
    `UPDATE workorders SET
      rec_date = ?, income_tax = ?, hse = ?, round_off = ?, gst_2 = ?, cem_bags = ?,
      labour_cess = ?, sd_amt = ?, penalty = ?, land_rent = ?, gst_rent_penalty = ?,
      price_deduction = ?, net_amount = ?, total_amt = ?, wo_status = 'Received',
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.rec_date,
    num(input.income_tax),
    num(input.hse),
    num(input.round_off),
    num(input.gst_2),
    num(input.cem_bags),
    num(input.labour_cess),
    num(input.sd_amt),
    num(input.penalty),
    num(input.land_rent),
    num(input.gst_rent_penalty),
    num(input.price_deduction),
    num(input.net_amount),
    num(input.total_amt),
    wo.id
  )
  return { ok: true, message: 'Record updated successfully.' }
}
