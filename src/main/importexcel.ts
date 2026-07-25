import { dialog, BrowserWindow } from 'electron'
import ExcelJS from 'exceljs'
import { getDb } from './db'

export interface ImportResult {
  ok: boolean
  message: string
  woInserted?: number
  woSkipped?: number
  dedInserted?: number
  filePath?: string
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

// Coerce any ExcelJS cell value to a trimmed string
function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] }
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join('').trim()
    if (o.text !== undefined) return String(o.text).trim()
    if (o.result !== undefined) return String(o.result).trim()
    if (v instanceof Date) return isoDate(v)
  }
  return String(v).trim()
}

function num(v: ExcelJS.CellValue): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object') {
    const o = v as { result?: unknown }
    if (o.result !== undefined && typeof o.result === 'number') return o.result
  }
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Normalise a date cell (Date object, ISO string, or dd-MMM-yy string) to ISO yyyy-mm-dd, or ''
function isoDate(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined || v === '') return ''
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  }
  if (typeof v === 'object') {
    const o = v as { result?: unknown }
    if (o.result instanceof Date) return isoDate(o.result)
    if (o.result !== undefined) return isoDate(o.result as ExcelJS.CellValue)
  }
  const s = String(v).trim()
  if (!s) return ''
  // yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`
  // dd-MMM-yy or dd-MMM-yyyy (e.g. 01-Sep-22)
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{2,4})$/)
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()]
    if (mon) {
      let y = +m[3]
      if (y < 100) y += y < 70 ? 2000 : 1900
      return `${y}-${pad(mon)}-${pad(+m[1])}`
    }
  }
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += y < 70 ? 2000 : 1900
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`
  }
  return ''
}

function findSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return wb.worksheets.find((w) => w.name.trim().toLowerCase() === name.toLowerCase())
}

export async function importExcel(
  win: BrowserWindow | null,
  opts: { mode: 'append' | 'replace' }
): Promise<ImportResult> {
  const picked = await dialog.showOpenDialog(win!, {
    title: 'Select Excel file to import',
    filters: [{ name: 'Excel Files', extensions: ['xlsm', 'xlsx'] }],
    properties: ['openFile']
  })
  if (picked.canceled || !picked.filePaths[0]) {
    return { ok: false, message: 'Import cancelled.' }
  }
  return importFromPath(picked.filePaths[0], opts.mode)
}

// Core import logic (no UI) — reusable + testable.
export async function importFromPath(
  filePath: string,
  mode: 'append' | 'replace'
): Promise<ImportResult> {
  const opts = { mode }
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.readFile(filePath)
  } catch (e) {
    return { ok: false, message: 'Could not read the file. Please pick a valid .xlsm/.xlsx.' }
  }

  const dataWs = findSheet(wb, 'Data')
  const dedWs = findSheet(wb, 'Deduction')
  if (!dataWs && !dedWs) {
    return {
      ok: false,
      message: "No 'Data' or 'Deduction' sheet found in that workbook."
    }
  }

  const db = getDb()
  let woInserted = 0
  let woSkipped = 0
  let dedInserted = 0

  const tx = db.transaction(() => {
    if (opts.mode === 'replace') {
      db.prepare('DELETE FROM workorders').run()
      db.prepare('DELETE FROM deductions').run()
      db.prepare('DELETE FROM work_order_list').run()
    }

    const woInsert = db.prepare(
      `INSERT OR IGNORE INTO workorders
        (fin_year, entry_date, work_order_no, start_date, end_date, invoice_no, invoice_date,
         rec_date, gross_value, gst_on_gross, total_amt, wo_status, cancel_remarks,
         income_tax, gst_2, cem_bags, labour_cess, penalty, land_rent, gst_rent_penalty,
         round_off, hse, price_deduction, sd_amt, net_amount, wo_name)
       VALUES (@fin_year, @entry_date, @work_order_no, @start_date, @end_date, @invoice_no,
         @invoice_date, @rec_date, @gross_value, @gst_on_gross, @total_amt, @wo_status,
         @cancel_remarks, @income_tax, @gst_2, @cem_bags, @labour_cess, @penalty, @land_rent,
         @gst_rent_penalty, @round_off, @hse, @price_deduction, @sd_amt, @net_amount, @wo_name)`
    )

    const woListUpsert = db.prepare(
      `INSERT INTO work_order_list (work_order_no, wo_name) VALUES (?, ?)
       ON CONFLICT(work_order_no) DO UPDATE SET wo_name = COALESCE(NULLIF(excluded.wo_name, ''), work_order_list.wo_name)`
    )

    if (dataWs) {
      dataWs.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // header
        const c = (i: number): ExcelJS.CellValue => row.getCell(i).value
        const workNo = text(c(3))
        const finYear = text(c(1))
        if (!workNo && !finYear && !text(c(6))) return // blank row

        const gross = num(c(9))
        const total = num(c(11))
        let gst = num(c(10))
        if (!gst && total) gst = total - gross
        const woName = text(c(26))

        const info = woInsert.run({
          fin_year: finYear,
          entry_date: isoDate(c(2)) || null,
          work_order_no: workNo,
          start_date: isoDate(c(4)) || null,
          end_date: isoDate(c(5)) || null,
          invoice_no: text(c(6)),
          invoice_date: isoDate(c(7)) || null,
          rec_date: isoDate(c(8)) || null,
          gross_value: gross,
          gst_on_gross: gst,
          total_amt: total,
          wo_status: text(c(12)) || 'Created',
          cancel_remarks: text(c(13)) || null,
          income_tax: num(c(14)),
          gst_2: num(c(15)),
          cem_bags: num(c(16)),
          labour_cess: num(c(17)),
          penalty: num(c(18)),
          land_rent: num(c(19)),
          gst_rent_penalty: num(c(20)),
          round_off: num(c(21)),
          hse: num(c(22)),
          price_deduction: num(c(23)),
          sd_amt: num(c(24)),
          net_amount: num(c(25)),
          wo_name: woName || null
        })
        if (info.changes > 0) woInserted++
        else woSkipped++
        if (workNo) woListUpsert.run(workNo, woName)
      })
    }

    const dedInsert = db.prepare(
      `INSERT INTO deductions
        (fin_year, work_order_no, invoice_no, deduct_date, rec_date, description,
         hse_debit, hse_credit, prs_debit, prs_credit, sd_debit, sd_credit, create_status, wo_name)
       VALUES (@fin_year, @work_order_no, @invoice_no, @deduct_date, @rec_date, @description,
         @hse_debit, @hse_credit, @prs_debit, @prs_credit, @sd_debit, @sd_credit, @create_status, @wo_name)`
    )

    if (dedWs) {
      dedWs.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const c = (i: number): ExcelJS.CellValue => row.getCell(i).value
        const workNo = text(c(2))
        if (!workNo && !text(c(1))) return
        const woName = text(c(15))
        dedInsert.run({
          fin_year: text(c(1)),
          work_order_no: workNo,
          invoice_no: text(c(3)),
          deduct_date: isoDate(c(4)) || null,
          rec_date: isoDate(c(5)) || null,
          description: text(c(6)) || null,
          hse_debit: num(c(7)),
          hse_credit: num(c(8)),
          prs_debit: num(c(9)),
          prs_credit: num(c(10)),
          sd_debit: num(c(11)),
          sd_credit: num(c(12)),
          create_status: text(c(13)) || 'Manual',
          wo_name: woName || null
        })
        dedInserted++
        if (workNo) woListUpsert.run(workNo, woName)
      })
    }
  })

  tx()

  const parts: string[] = []
  parts.push(`${woInserted} work order${woInserted === 1 ? '' : 's'} imported`)
  if (woSkipped) parts.push(`${woSkipped} skipped (duplicates)`)
  parts.push(`${dedInserted} deduction entr${dedInserted === 1 ? 'y' : 'ies'} imported`)

  return {
    ok: true,
    message: parts.join(', ') + '.',
    woInserted,
    woSkipped,
    dedInserted,
    filePath
  }
}
