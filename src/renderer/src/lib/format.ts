import { format, parse, isValid } from 'date-fns'
import { toast } from 'sonner'

// Show an error toast and return void (usable as `return fail(msg)` in void fns)
export function fail(msg: string): void {
  toast.error(msg)
}

// Amount with thousands separators and 2 decimals (Indian-style grouping via en-IN)
export function formatAmt(v: number | string | null | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  if (isNaN(n)) return '0.00'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Compact Indian currency: 1,23,45,678 -> "1.23 Cr", 2,50,000 -> "2.50 L"
export function formatCompactINR(v: number | null | undefined): string {
  const n = typeof v === 'number' ? v : 0
  const a = Math.abs(n)
  if (a >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`
  if (a >= 1e5) return `${(n / 1e5).toFixed(2)} L`
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

// Display an ISO (yyyy-mm-dd) or any parseable date as dd-MM-yyyy
export function formatDate(v: string | null | undefined): string {
  if (!v) return ''
  const s = String(v).trim()
  if (!s) return ''
  // ISO (yyyy-mm-dd…)
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
    const d = new Date(s)
    if (isValid(d)) return format(d, 'dd-MM-yyyy')
  }
  // legacy / other display formats
  for (const f of ['dd-MM-yyyy', 'dd/MM/yyyy', 'dd-MMM-yyyy', 'dd-MMM-yy']) {
    const p = parse(s, f, new Date())
    if (isValid(p)) return format(p, 'dd-MM-yyyy')
  }
  const d = new Date(s)
  if (isValid(d)) return format(d, 'dd-MM-yyyy')
  return s
}

// Normalise a user-typed date into ISO yyyy-mm-dd for storage. Returns '' if invalid/blank.
export function toISODate(v: string | null | undefined): string {
  if (!v || !v.trim()) return ''
  const s = v.trim()
  // ISO first
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const p = parse(s, 'yyyy-MM-dd', new Date())
    if (isValid(p)) return format(p, 'yyyy-MM-dd')
  }
  // dd-mm-yyyy is the primary input format
  const formats = [
    'dd-MM-yyyy',
    'dd/MM/yyyy',
    'd-M-yyyy',
    'd/M/yyyy',
    'dd-MM-yy',
    'dd-MMM-yyyy',
    'dd-MMM-yy'
  ]
  for (const f of formats) {
    const p = parse(s, f, new Date())
    if (isValid(p)) return format(p, 'yyyy-MM-dd')
  }
  const d = new Date(s)
  if (isValid(d)) return format(d, 'yyyy-MM-dd')
  return ''
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function todayDisplay(): string {
  return format(new Date(), 'dd-MM-yyyy')
}

// Financial year for a date: Apr-Mar. e.g. 2025-06-01 -> "2025-26"
export function financialYear(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1 // 1-12
  if (m >= 4) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`
}

export function errText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.replace(/^Error invoking remote method '[^']*':\s*/i, '')
}
