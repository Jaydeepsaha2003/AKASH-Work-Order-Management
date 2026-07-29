import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save, Eraser, Pencil, RefreshCw, Trash2, CalendarDays, CalendarRange, FilePlus2, Search, Upload, FileDown, Loader2 } from 'lucide-react'
import type { WorkOrder } from '../lib/types'
import { Field, TextInput, NumberInput, DateInput, DataTable, Select, EditableCombo, AttachmentBar, AttachIconButton, type Column, type FileRef } from '../components/ui'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'
import {
  formatAmt,
  formatDate,
  financialYear,
  toNum,
  todayISO,
  errText,
  fail
} from '../lib/format'

const blank = {
  work_order_no: '',
  invoice_no: '',
  start_date: '',
  end_date: '',
  invoice_date: todayISO(),
  gross_value: '',
  gst_per: '',
  gst_amt: '',
  wo_name: ''
}

// stable key that ties attachments to a work-order/invoice record
const rk = (fy: string, wo: string, inv: string): string => [fy, wo, inv].join('::')

// Columns for the Create WO Excel import/template (must match the main-process importer)
const WO_TEMPLATE_HEADERS = [
  'Work Order No',
  'Invoice No',
  'Invoice Date',
  'Work Start Date',
  'Work End Date',
  'Gross Value',
  'GST %',
  'GST Amount',
  'Name of WO'
]
// One illustrative row so users see the expected format (dates dd-mm-yyyy; give GST % OR GST Amount)
const WO_TEMPLATE_SAMPLE: (string | number)[] = [
  '70190647',
  '25',
  '01-09-2025',
  '01-05-2025',
  '21-07-2025',
  800000,
  18,
  '',
  'GRASS CUTTING JOB'
]

export default function CreateWO(): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [names, setNames] = useState<string[]>([])
  const [woNameMap, setWoNameMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sel, setSel] = useState<number>(-1)
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState<WorkOrder | null>(null)
  const [woStatus, setWoStatus] = useState('Created')
  const [cancelRemarks, setCancelRemarks] = useState('')
  const [importing, setImporting] = useState(false)
  const [attachments, setAttachments] = useState<FileRef[]>([])
  const [attachMap, setAttachMap] = useState<Record<string, FileRef[]>>({})

  async function reload(): Promise<void> {
    const [list, nm, attach] = await Promise.all([
      window.api.wo.list(),
      window.api.wo.names(),
      window.api.attach.listScope({ scope: 'wo' })
    ])
    setRows(list)
    setNames(nm.map((n) => n.work_order_no))
    setWoNameMap(Object.fromEntries(nm.map((n) => [n.work_order_no, n.wo_name || ''])))
    const map: Record<string, FileRef[]> = {}
    for (const a of attach) {
      ;(map[a.ref_key] ||= []).push({ filename: a.filename, originalName: a.original_name || a.filename })
    }
    setAttachMap(map)
  }
  useEffect(() => {
    reload()
  }, [])

  const finYear = useMemo(
    () => financialYear(form.invoice_date ? new Date(form.invoice_date) : new Date()),
    [form.invoice_date]
  )

  const totalAmt = useMemo(() => {
    const gross = toNum(form.gross_value)
    if (!form.gross_value) return ''
    const hasPct = form.gst_per !== ''
    const hasAmt = form.gst_amt !== ''
    if (hasPct && hasAmt) return 'ERR'
    let gst = 0
    if (hasPct) gst = (gross * toNum(form.gst_per)) / 100
    else if (hasAmt) gst = toNum(form.gst_amt)
    return (gross + gst).toFixed(2)
  }, [form.gross_value, form.gst_per, form.gst_amt])

  const filtered = useMemo(() => {
    // Create WO list shows everything except already-Received work orders
    let base = rows.filter((r) => (r.wo_status || '').toLowerCase() !== 'received')
    // date range (by invoice date)
    if (from || to) {
      base = base.filter((r) => {
        const d = r.invoice_date || ''
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    }
    const terms = search.toLowerCase().replace(/\s/g, '').split(',').filter(Boolean)
    if (!terms.length) return base
    return base.filter((r) => {
      const hay = [
        r.fin_year,
        r.work_order_no,
        r.invoice_no,
        r.wo_name,
        r.wo_status,
        formatDate(r.start_date),
        formatDate(r.end_date),
        formatDate(r.invoice_date)
      ]
        .join(' ')
        .toLowerCase()
        .replace(/\s/g, '')
      return terms.every((t) => hay.includes(t))
    })
  }, [rows, search, from, to])

  const totals = useMemo(() => {
    let gross = 0,
      gst = 0,
      total = 0
    for (const r of filtered) {
      gross += r.gross_value
      gst += r.gst_on_gross
      total += r.total_amt
    }
    return { gross, gst, total }
  }, [filtered])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function clear(): void {
    setForm({ ...blank, invoice_date: todayISO() })
    setEditing(null)
    setSel(-1)
    setWoStatus('Created')
    setCancelRemarks('')
    setAttachments([])
  }

  async function save(): Promise<void> {
    if (totalAmt === 'ERR') {
      toast.error('Please enter either GST % or GST Amount, not both.')
      return
    }
    if (!form.work_order_no.trim()) return fail('Work Order No is required.')
    if (!form.invoice_no.trim()) return fail('Invoice No is required.')
    try {
      const res = await window.api.wo.create({
        fin_year: finYear,
        work_order_no: form.work_order_no.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        invoice_no: form.invoice_no.trim(),
        invoice_date: form.invoice_date || null,
        gross_value: toNum(form.gross_value),
        total_amt: toNum(totalAmt),
        wo_name: form.wo_name || null
      })
      if (res.ok) {
        await window.api.attach.sync({
          scope: 'wo',
          refKey: rk(finYear, form.work_order_no.trim(), form.invoice_no.trim()),
          files: attachments
        })
        toast.success(res.message)
        clear()
        reload()
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function beginEdit(r: WorkOrder): void {
    if ((r.wo_status || '').toLowerCase() === 'received') {
      return fail("Editing is not allowed for records marked as 'Received'.")
    }
    setEditing(r)
    setWoStatus(r.wo_status || 'Created')
    setCancelRemarks(r.cancel_remarks || '')
    setForm({
      work_order_no: r.work_order_no,
      invoice_no: r.invoice_no,
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      invoice_date: r.invoice_date || todayISO(),
      gross_value: String(r.gross_value ?? ''),
      gst_per: '',
      gst_amt: String(r.gst_on_gross ?? ''),
      wo_name: r.wo_name || ''
    })
    window.scrollTo?.({ top: 0 })
    window.api.attach
      .list({ scope: 'wo', refKey: rk(r.fin_year, r.work_order_no, r.invoice_no) })
      .then((list) =>
        setAttachments(list.map((a) => ({ filename: a.filename, originalName: a.original_name || a.filename })))
      )
    toast.info('Edit mode enabled. Fin-Year and Work Order No are locked.')
  }


  async function update(): Promise<void> {
    if (!editing) return
    try {
      const res = await window.api.wo.update({
        id: editing.id,
        fin_year: finYear,
        work_order_no: form.work_order_no,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        invoice_no: form.invoice_no.trim(),
        invoice_date: form.invoice_date || null,
        gross_value: toNum(form.gross_value),
        total_amt: toNum(totalAmt === 'ERR' ? '0' : totalAmt),
        wo_name: form.wo_name || null,
        wo_status: woStatus,
        cancel_remarks: cancelRemarks || null
      })
      if (res.ok) {
        await window.api.attach.sync({
          scope: 'wo',
          refKey: rk(finYear, form.work_order_no.trim(), form.invoice_no.trim()),
          files: attachments
        })
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  async function removeRow(r: WorkOrder): Promise<void> {
    if (!confirm('Are you sure you want to delete this work order? This action cannot be undone.'))
      return
    try {
      const res = await window.api.wo.remove(r.id)
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }


  // Download a blank Create WO template (headers + one sample row) as Excel
  async function downloadTemplate(): Promise<void> {
    try {
      const res = await window.api.excel.export({
        defaultName: `CreateWO_Template_${todayISO()}`,
        headers: WO_TEMPLATE_HEADERS,
        rows: [WO_TEMPLATE_SAMPLE]
      })
      if (res.ok) toast.success('Template downloaded. Fill it and use Import.')
      else if (res.message) toast.message(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  // Bulk-import work orders from an Excel file (appends into the active company)
  async function importExcel(): Promise<void> {
    setImporting(true)
    try {
      const res = await window.api.wo.importExcel('append')
      if (res.ok) {
        toast.success(res.message)
        reload()
      } else if (res.message && res.message !== 'Import cancelled.') {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error(errText(e))
    } finally {
      setImporting(false)
    }
  }

  function buildDownload(): DownloadPayload {
    return {
      title: 'Work Orders',
      defaultBase: `WorkOrders_${todayISO()}`,
      headers: [
        'Fin-Year',
        'Entry Date',
        'Work Order',
        'Start Date',
        'End Date',
        'Invoice No',
        'Invoice Date',
        'Rec Date',
        'Gross Value',
        'GST on Gross',
        'Total Amt',
        'WO Status',
        'Cancel Remarks',
        'Name of Work Order'
      ],
      rows: filtered.map((r) => [
        r.fin_year,
        formatDate(r.entry_date),
        r.work_order_no,
        formatDate(r.start_date),
        formatDate(r.end_date),
        r.invoice_no,
        formatDate(r.invoice_date),
        formatDate(r.rec_date),
        r.gross_value,
        r.gst_on_gross,
        r.total_amt,
        r.wo_status,
        r.cancel_remarks || '',
        r.wo_name || ''
      ]),
      subtotalCols: [8, 9, 10]
    }
  }

  const columns: Column<WorkOrder>[] = [
    { key: 'fin_year', header: 'Fin-Year', width: 78, tabular: true, light: true },
    { key: 'entry_date', header: 'Entry Date', width: 96, tabular: true, light: true, render: (r) => formatDate(r.entry_date) },
    { key: 'work_order_no', header: 'Work Order', width: 95, tabular: true },
    { key: 'start_date', header: 'Start Date', width: 96, tabular: true, render: (r) => formatDate(r.start_date) },
    { key: 'end_date', header: 'End Date', width: 96, tabular: true, render: (r) => formatDate(r.end_date) },
    { key: 'invoice_no', header: 'Invoice No', width: 75, tabular: true },
    { key: 'invoice_date', header: 'Invoice Date', width: 96, tabular: true, render: (r) => formatDate(r.invoice_date) },
    { key: 'rec_date', header: 'Rec Date', width: 96, tabular: true, render: (r) => formatDate(r.rec_date) },
    { key: 'gross_value', header: 'Gross Value', width: 110, numeric: true, render: (r) => formatAmt(r.gross_value) },
    { key: 'gst_on_gross', header: 'GST on Gross', width: 110, numeric: true, render: (r) => formatAmt(r.gst_on_gross) },
    { key: 'total_amt', header: 'Total Amt', width: 120, numeric: true, render: (r) => formatAmt(r.total_amt) },
    {
      key: 'wo_status',
      header: 'WO Status',
      width: 90,
      render: (r) => <StatusBadge status={r.wo_status} />
    },
    { key: 'wo_name', tabular: true, header: 'Name of Work Order', width: 160, render: (r) => r.wo_name || '' }
  ]

  return (
    <div className="flex h-full gap-3">
      {/* LEFT: form column (fields stacked one per row) */}
      <div className="card flex w-[360px] shrink-0 flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold uppercase tracking-wide leading-tight text-brand-700">
            <FilePlus2 className="h-5 w-5 shrink-0" />
            {editing ? 'Edit Work Order' : 'Create Invoice'}
          </h2>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 font-heading text-[13px] font-semibold text-brand-700">
            <CalendarDays className="h-3.5 w-3.5" /> FY {finYear}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Work Order No">
              <EditableCombo
                value={form.work_order_no}
                onChange={(v) => {
                  set('work_order_no', v)
                  // auto-fill Name of WO when an existing work order is chosen (user can still edit it)
                  const known = woNameMap[v]
                  if (known) set('wo_name', known)
                }}
                options={names}
                disabled={!!editing}
                placeholder="Select or type…"
              />
            </Field>
            <Field label="Invoice No">
              <TextInput className="tabular" value={form.invoice_no} onChange={(e) => set('invoice_no', e.target.value)} />
            </Field>
            <Field label="Invoice Date">
              <DateInput iso={form.invoice_date} onISO={(v) => set('invoice_date', v)} />
            </Field>
            <Field label="Work Start Date">
              <DateInput iso={form.start_date} onISO={(v) => set('start_date', v)} />
            </Field>
            <Field label="Work End Date">
              <DateInput iso={form.end_date} onISO={(v) => set('end_date', v)} />
            </Field>
            <Field label="Gross Value">
              <NumberInput value={form.gross_value} onValue={(v) => set('gross_value', v)} />
            </Field>
            <Field label="GST %">
              <NumberInput value={form.gst_per} onValue={(v) => set('gst_per', v)} disabled={!!editing} />
            </Field>
            <Field label="GST Amt">
              <NumberInput value={form.gst_amt} onValue={(v) => set('gst_amt', v)} />
            </Field>
            <Field label="Total Amt">
              <TextInput
                readOnlyLook
                readOnly
                value={totalAmt === 'ERR' ? '' : totalAmt}
                className="tabular text-right font-semibold"
              />
            </Field>
            <Field label="Name of WO">
              <TextInput className="tabular" value={form.wo_name} onChange={(e) => set('wo_name', e.target.value)} />
            </Field>

            {editing && (
              <Field label="WO Status">
                <Select
                  value={woStatus}
                  onChange={setWoStatus}
                  options={[
                    { value: 'Created', label: 'Created' },
                    { value: 'Cancelled', label: 'Cancelled' }
                  ]}
                />
              </Field>
            )}
            {editing && woStatus === 'Cancelled' && (
              <Field label="Cancel Remarks">
                <TextInput value={cancelRemarks} onChange={(e) => setCancelRemarks(e.target.value)} />
              </Field>
            )}

            <div className="mt-1 border-t border-slate-300 pt-2">
              <AttachmentBar files={attachments} onChange={setAttachments} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {editing ? (
            <button className="btn-primary flex-1" onClick={update}>
              <RefreshCw className="h-4 w-4" /> Update
            </button>
          ) : (
            <button className="btn-green flex-1" onClick={save}>
              <Save className="h-4 w-4" /> Save
            </button>
          )}
          <button className="btn-red flex-1" onClick={clear}>
            <Eraser className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      {/* RIGHT: toolbar + table + totals */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="relative w-56 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 w-full border-slate-300 bg-white pl-9 shadow-sm focus:shadow"
              placeholder="Search......"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DownloadMenu build={buildDownload} />
          <button
            className="btn-ghost !px-2.5"
            onClick={downloadTemplate}
            title="Download the Excel import template"
            aria-label="Download import template"
          >
            <FileDown className="h-[18px] w-[18px]" />
          </button>
          <button
            className="btn-teal !px-2.5"
            onClick={importExcel}
            disabled={importing}
            title="Import work orders from Excel"
            aria-label="Import work orders from Excel"
          >
            {importing ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Upload className="h-[18px] w-[18px]" />
            )}
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <CalendarRange className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="shrink-0 text-[13px] font-semibold text-slate-500">Range</span>
            <div className="w-32 shrink-0">
              <DateInput iso={from} onISO={setFrom} />
            </div>
            <span className="shrink-0 text-slate-300">–</span>
            <div className="w-32 shrink-0">
              <DateInput iso={to} onISO={setTo} />
            </div>
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom('')
                  setTo('')
                }}
                className="shrink-0 text-[13px] font-semibold text-slate-400 hover:text-brand-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <DataTable
            columns={columns}
            rows={filtered}
            minWidth={1250}
            defaultSort={[
              { key: 'fin_year', dir: 'desc' },
              { key: 'invoice_no', dir: 'asc' }
            ]}
            selectedIndex={sel}
            onSelect={(i) => setSel(i)}
            onRowDoubleClick={(_i, r) => beginEdit(r)}
            rowActions={(r) => (
              <div className="flex items-center justify-center gap-1">
                <AttachIconButton files={attachMap[rk(r.fin_year, r.work_order_no, r.invoice_no)]} />
                <button
                  title="Edit"
                  onClick={() => beginEdit(r)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-brand-600 transition hover:bg-brand-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  title="Delete"
                  onClick={() => removeRow(r)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </div>

        <div className="app-gradient grid grid-cols-3 gap-4 rounded-xl px-6 py-2.5 text-white">
          <FooterStat label="Turnover" value={totals.gross} />
          <FooterStat label="GST Total" value={totals.gst} />
          <FooterStat label="Landed Amt" value={totals.total} />
        </div>
      </div>
    </div>
  )
}

function FooterStat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="text-center">
      <div className="text-[13px] uppercase tracking-wide text-white/70">{label}</div>
      <div className="tabular font-heading text-lg font-bold">₹ {formatAmt(value)}</div>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const s = (status || '').toLowerCase()
  const cls =
    s === 'received'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'cancelled'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-semibold ${cls}`}>
      {status || 'Created'}
    </span>
  )
}
