import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { errText, formatAmt } from './format'

export interface DownloadPayload {
  title: string
  defaultBase: string // filename without extension
  headers: string[]
  rows: (string | number)[][]
  subtotalCols?: number[] // 0-based numeric columns to total
  summary?: { label: string; value: string }[]
}

function cell(v: string | number): string {
  return typeof v === 'number' ? formatAmt(v) : String(v ?? '')
}

function sumCol(rows: (string | number)[][], c: number): number {
  let s = 0
  for (const r of rows) {
    const v = r[c]
    s += typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || 0
  }
  return s
}

// Make a company name safe for use in a filename
function slug(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40)
}

// "<Company>_<base>" — prefixes the active company name when available
async function scopedName(base: string): Promise<string> {
  try {
    const c = await window.api.company.active()
    if (c?.name) return `${slug(c.name)}_${base}`
  } catch {
    /* ignore */
  }
  return base
}

// ---- Excel (delegates to the main process ExcelJS writer) ----
export async function exportExcel(p: DownloadPayload): Promise<void> {
  try {
    const res = await window.api.excel.export({
      defaultName: `${await scopedName(p.defaultBase)}.xlsx`,
      headers: p.headers,
      rows: p.rows,
      subtotalCols: p.subtotalCols,
      summary: p.summary
    })
    if (res.ok) toast.success('Excel exported successfully.')
    else toast.message(res.message)
  } catch (e) {
    toast.error(errText(e))
  }
}

// ---- PDF (jsPDF + autotable in the renderer, saved via main) ----
function bufToBase64(buf: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function exportPDF(p: DownloadPayload): Promise<void> {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Active company branding (logo + name/address)
    let company: { name?: string; address?: string | null; gstin?: string | null; logo?: string | null } | null = null
    try {
      company = await window.api.company.active()
    } catch {
      company = null
    }

    let headerBottom = 40
    let textX = 40
    if (company?.logo) {
      try {
        const fmt = company.logo.includes('image/png')
          ? 'PNG'
          : company.logo.includes('image/jpeg') || company.logo.includes('image/jpg')
            ? 'JPEG'
            : 'PNG'
        doc.addImage(company.logo, fmt, 40, 26, 46, 46)
        textX = 96
      } catch {
        /* ignore bad logo */
      }
    }

    if (company?.name) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(76, 29, 149)
      doc.text(company.name, textX, 40)
      let ly = 54
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(110)
      if (company.address) {
        doc.text(String(company.address).replace(/\n/g, ', '), textX, ly)
        ly += 12
      }
      if (company.gstin) {
        doc.text(`GSTIN: ${company.gstin}`, textX, ly)
        ly += 12
      }
      headerBottom = Math.max(78, ly)
    }

    // Report title (right-aligned) + timestamp
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(30, 30, 40)
    doc.text(p.title, pageW - 40, 40, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(120)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageW - 40, 54, { align: 'right' })

    // separator line
    doc.setDrawColor(124, 58, 237)
    doc.setLineWidth(1)
    doc.line(40, headerBottom, pageW - 40, headerBottom)

    const startY = headerBottom + 10
    const body = p.rows.map((r) => r.map(cell))
    if (p.subtotalCols?.length) {
      const sub: string[] = new Array(p.headers.length).fill('')
      sub[0] = 'SUBTOTAL'
      for (const c of p.subtotalCols) sub[c] = formatAmt(sumCol(p.rows, c))
      body.push(sub)
    }

    autoTable(doc, {
      head: [p.headers],
      body,
      startY,
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      margin: { left: 40, right: 40 },
      didParseCell: (data) => {
        const raw = data.row.raw as unknown as string[]
        if (Array.isArray(raw) && raw[0] === 'SUBTOTAL') {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [237, 233, 254]
        }
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (doc as any).lastAutoTable.finalY + 24
    if (p.summary?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      for (const s of p.summary) {
        doc.text(`${s.label}:   ${s.value}`, 40, y)
        y += 16
      }
    }

    const base64 = bufToBase64(doc.output('arraybuffer'))
    const pdfBase = company?.name ? `${slug(company.name)}_${p.defaultBase}` : p.defaultBase
    const res = await window.api.file.save({ defaultName: `${pdfBase}.pdf`, base64 })
    if (res.ok) toast.success('PDF exported successfully.')
    else toast.message(res.message)
  } catch (e) {
    toast.error(errText(e))
  }
}
