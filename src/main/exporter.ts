import { dialog, BrowserWindow } from 'electron'
import ExcelJS from 'exceljs'

export interface ExportRequest {
  defaultName: string
  headers: string[]
  rows: (string | number)[][]
  // 0-based column indexes that should get a SUM subtotal row at the bottom
  subtotalCols?: number[]
  // optional extra summary lines appended below (label, value)
  summary?: { label: string; value: string }[]
}

export async function exportToExcel(
  win: BrowserWindow | null,
  req: ExportRequest
): Promise<{ ok: boolean; message: string; path?: string }> {
  if (!req.rows || req.rows.length === 0) {
    return { ok: false, message: 'There is no data to export.' }
  }

  const result = await dialog.showSaveDialog(win!, {
    title: 'Save Exported Data',
    defaultPath: req.defaultName,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  })
  if (result.canceled || !result.filePath) {
    return { ok: false, message: 'Export cancelled.' }
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Export')

  const headerRow = ws.addRow(req.headers)
  headerRow.font = { bold: true }
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  for (const r of req.rows) {
    ws.addRow(r)
  }

  const dataEnd = req.rows.length + 1 // +1 for header row

  if (req.subtotalCols && req.subtotalCols.length) {
    const subtotal: (string | number)[] = new Array(req.headers.length).fill('')
    subtotal[0] = 'SUBTOTAL'
    const sub = ws.addRow(subtotal)
    sub.font = { bold: true }
    for (const c of req.subtotalCols) {
      const colLetter = ws.getColumn(c + 1).letter
      ws.getCell(dataEnd + 1, c + 1).value = {
        formula: `SUBTOTAL(109,${colLetter}2:${colLetter}${dataEnd})`
      }
    }
  }

  if (req.summary && req.summary.length) {
    ws.addRow([])
    for (const s of req.summary) {
      const row = ws.addRow([s.label, s.value])
      row.font = { bold: true }
    }
  }

  // borders + autofit-ish widths
  ws.columns.forEach((col) => {
    let max = 10
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > max) max = len
    })
    col.width = Math.min(max + 2, 40)
  })
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
  })

  await wb.xlsx.writeFile(result.filePath)
  return { ok: true, message: 'Data exported successfully.', path: result.filePath }
}
