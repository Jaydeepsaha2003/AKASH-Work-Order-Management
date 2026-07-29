import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList,
  Save,
  Eraser,
  RefreshCw,
  Pencil,
  Trash2,
  Search,
  Layers,
  Upload,
  Loader2
} from 'lucide-react'
import type { WoMaster } from '../lib/types'
import {
  Field,
  TextInput,
  NumberInput,
  DateInput,
  Select,
  Segmented,
  DataTable,
  cn,
  type Column
} from '../components/ui'
import { formatAmt, formatDate, toNum, todayISO, errText, fail } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'

/* ---------- date maths (local-time, no timezone drift) ---------- */
function parseISO(iso: string | null): { y: number; mo: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null
}
function toISO(dt: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}
// completion = site handover + period (days/months/years), minus one day
function completionISO(handover: string | null, value: number, unit: string | null): string {
  const p = parseISO(handover)
  if (!p || !value) return ''
  const dt = new Date(p.y, p.mo - 1, p.d)
  const u = (unit || 'Months').toLowerCase()
  if (u.startsWith('day')) dt.setDate(dt.getDate() + Math.round(value))
  else if (u.startsWith('year')) dt.setFullYear(dt.getFullYear() + Math.round(value))
  else dt.setMonth(dt.getMonth() + Math.round(value))
  dt.setDate(dt.getDate() - 1)
  return toISO(dt)
}

const PERIOD_UNITS = ['Days', 'Months', 'Years']
function unitShort(u: string | null): string {
  const s = (u || 'Months').toLowerCase()
  return s.startsWith('day') ? 'D' : s.startsWith('year') ? 'Y' : 'M'
}
function daysFromToday(iso: string): number | null {
  const p = parseISO(iso)
  if (!p) return null
  const target = new Date(p.y, p.mo - 1, p.d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

type WoRow = WoMaster & {
  sl: number
  balance_value: number
  actual_completion: string
  revised_completion: string
  balance_days: number | null
  days_consumed: number | null
  status: 'Running' | 'Expired' | '—'
}

const blank = {
  name_of_work: '',
  job_location: '',
  work_order_no: '',
  wo_date: todayISO(),
  wo_value: '',
  period_months: '',
  period_unit: 'Months',
  site_handover_date: '',
  revised_handover_date: '',
  on_site: 'In Process',
  remarks: ''
}

const ON_SITE = ['In Process', 'Under final', 'Completed']

export default function CreateWorkOrder(): React.JSX.Element {
  const [rows, setRows] = useState<WoMaster[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Running' | 'Expired'>('all')
  const [pickedWo, setPickedWo] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...blank })
  const [importing, setImporting] = useState(false)
  // executed value per work order = sum of matched invoices' basic value
  const [execMap, setExecMap] = useState<Record<string, number>>({})

  async function reload(): Promise<void> {
    const [list, invoices] = await Promise.all([window.api.wom.list(), window.api.wo.list()])
    setRows(list)
    const map: Record<string, number> = {}
    for (const inv of invoices) {
      const k = inv.work_order_no || ''
      if (!k) continue
      map[k] = (map[k] || 0) + (inv.gross_value || 0)
    }
    setExecMap(map)
  }

  async function importExcel(): Promise<void> {
    setImporting(true)
    try {
      const res = await window.api.wom.importExcel('append')
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
  useEffect(() => {
    reload()
  }, [])

  // enrich every row with the computed columns
  const enriched = useMemo<WoRow[]>(() => {
    return rows.map((r, i) => {
      const actual_completion = completionISO(r.site_handover_date, r.period_months, r.period_unit)
      const revised_completion = r.revised_handover_date
        ? completionISO(r.revised_handover_date, r.period_months, r.period_unit)
        : ''
      // balance days count against the revised completion when present, else actual
      const effectiveCompletion = revised_completion || actual_completion
      const balance_days = effectiveCompletion ? daysFromToday(effectiveCompletion) : null
      const consumed = r.site_handover_date ? daysFromToday(r.site_handover_date) : null
      const executed = execMap[r.work_order_no] ?? 0 // always from matched invoices
      const status: WoRow['status'] =
        balance_days === null ? '—' : balance_days < 0 ? 'Expired' : 'Running'
      return {
        ...r,
        sl: i + 1,
        executed_value: executed,
        balance_value: (r.wo_value || 0) - executed,
        actual_completion,
        revised_completion,
        balance_days,
        days_consumed: consumed === null ? null : -consumed,
        status
      }
    })
  }, [rows, execMap])

  const filtered = useMemo(() => {
    let base = enriched
    if (statusFilter !== 'all') base = base.filter((r) => r.status === statusFilter)
    if (pickedWo) base = base.filter((r) => r.work_order_no === pickedWo)
    const t = search.toLowerCase().trim()
    if (t) {
      base = base.filter((r) =>
        [r.work_order_no, r.name_of_work, r.job_location, r.on_site, r.status]
          .join(' ')
          .toLowerCase()
          .includes(t)
      )
    }
    return base
  }, [enriched, statusFilter, pickedWo, search])

  const totals = useMemo(() => {
    let v = 0,
      e = 0,
      b = 0
    for (const r of filtered) {
      v += r.wo_value || 0
      e += r.executed_value || 0
      b += r.balance_value || 0
    }
    return { v, e, b }
  }, [filtered])

  function set<K extends keyof typeof form>(k: K, val: (typeof form)[K]): void {
    setForm((f) => ({ ...f, [k]: val }))
  }

  function clear(): void {
    setForm({ ...blank, wo_date: todayISO() })
    setEditId(null)
  }

  function payload(): Parameters<typeof window.api.wom.create>[0] {
    return {
      name_of_work: form.name_of_work || null,
      job_location: form.job_location || null,
      work_order_no: form.work_order_no.trim(),
      wo_date: form.wo_date || null,
      wo_value: toNum(form.wo_value),
      // executed value is derived from matched invoices (stored as a snapshot)
      executed_value: execMap[form.work_order_no.trim()] ?? 0,
      period_months: toNum(form.period_months),
      period_unit: form.period_unit || 'Months',
      site_handover_date: form.site_handover_date || null,
      revised_handover_date: form.revised_handover_date || null,
      on_site: form.on_site || null,
      remarks: form.remarks || null
    }
  }

  async function save(): Promise<void> {
    if (!form.work_order_no.trim()) return fail('Work Order No is required.')
    try {
      const res = editId
        ? await window.api.wom.update({ ...payload(), id: editId })
        : await window.api.wom.create(payload())
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function beginEdit(r: WoMaster): void {
    setEditId(r.id)
    setForm({
      name_of_work: r.name_of_work || '',
      job_location: r.job_location || '',
      work_order_no: r.work_order_no || '',
      wo_date: r.wo_date || todayISO(),
      wo_value: String(r.wo_value ?? ''),
      period_months: String(r.period_months ?? ''),
      period_unit: r.period_unit || 'Months',
      site_handover_date: r.site_handover_date || '',
      revised_handover_date: r.revised_handover_date || '',
      on_site: r.on_site || 'In Process',
      remarks: r.remarks || ''
    })
    window.scrollTo?.({ top: 9999 })
  }

  async function removeRow(r: WoMaster): Promise<void> {
    if (!confirm('Delete this work order? This cannot be undone.')) return
    try {
      const res = await window.api.wom.remove(r.id)
      if (res.ok) {
        toast.success(res.message)
        if (editId === r.id) clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function buildDownload(): DownloadPayload {
    return {
      title: 'Work Orders',
      defaultBase: `WorkOrders_${todayISO()}`,
      headers: [
        'SL',
        'Name of Work',
        'Job Location',
        'Work Order No',
        'WO Date',
        'WO Value',
        'Executed WO Value',
        'Balance WO Value',
        'Completion Period',
        'Actual Site Handover',
        'Revised Site Handover',
        'Actual Completion Date',
        'Revised Completion Date',
        'Balance Days',
        'Status',
        'On Site',
        'Days Consumed'
      ],
      rows: filtered.map((r) => [
        r.sl,
        r.name_of_work || '',
        r.job_location || '',
        r.work_order_no,
        formatDate(r.wo_date),
        r.wo_value,
        r.executed_value,
        r.balance_value,
        `${r.period_months || 0} ${r.period_unit || 'Months'}`,
        formatDate(r.site_handover_date),
        formatDate(r.revised_handover_date),
        formatDate(r.actual_completion),
        formatDate(r.revised_completion),
        r.balance_days ?? '',
        r.status,
        r.on_site || '',
        r.days_consumed ?? ''
      ]),
      subtotalCols: [5, 6, 7]
    }
  }

  const columns: Column<WoRow>[] = [
    { key: 'sl', header: 'SL', width: 50, wrap: true, tabular: true, align: 'right' },
    { key: 'name_of_work', header: 'Name of Work', width: 210, wrap: true, render: (r) => r.name_of_work || '' },
    { key: 'job_location', header: 'Job Location', width: 120, wrap: true, render: (r) => r.job_location || '' },
    { key: 'work_order_no', header: 'Work Order No', width: 100, wrap: true, tabular: true },
    { key: 'wo_date', header: 'WO Date', width: 92, wrap: true, tabular: true, render: (r) => formatDate(r.wo_date) },
    { key: 'wo_value', header: 'WO Value', width: 118, wrap: true, numeric: true, render: (r) => formatAmt(r.wo_value) },
    { key: 'executed_value', header: 'Executed WO Value', width: 118, wrap: true, numeric: true, render: (r) => formatAmt(r.executed_value) },
    {
      key: 'balance_value',
      header: 'Balance WO Value',
      width: 118,
      wrap: true,
      numeric: true,
      render: (r) => (
        <span className={r.balance_value < 0 ? 'text-rose-600' : 'text-slate-800'}>
          {formatAmt(r.balance_value)}
        </span>
      )
    },
    { key: 'period_months', header: 'Completion Period', width: 100, wrap: true, tabular: true, align: 'right', render: (r) => `${r.period_months || 0} ${unitShort(r.period_unit)}` },
    { key: 'site_handover_date', header: 'Actual Site Handover', width: 100, wrap: true, tabular: true, render: (r) => formatDate(r.site_handover_date) },
    {
      key: 'revised_handover_date',
      header: 'Revised Site Handover',
      width: 100,
      wrap: true,
      tabular: true,
      render: (r) =>
        r.revised_handover_date ? (
          <span className="text-amber-600">{formatDate(r.revised_handover_date)}</span>
        ) : (
          '—'
        )
    },
    { key: 'actual_completion', header: 'Actual Completion Date', width: 100, wrap: true, tabular: true, render: (r) => formatDate(r.actual_completion) },
    {
      key: 'revised_completion',
      header: 'Revised Completion Date',
      width: 100,
      wrap: true,
      tabular: true,
      render: (r) =>
        r.revised_completion ? (
          <span className="text-amber-600">{formatDate(r.revised_completion)}</span>
        ) : (
          '—'
        )
    },
    {
      key: 'balance_days',
      header: 'Balance Days',
      width: 84,
      wrap: true,
      align: 'right',
      tabular: true,
      render: (r) =>
        r.balance_days === null ? (
          '—'
        ) : (
          <span className={r.balance_days < 0 ? 'text-rose-600' : 'text-emerald-600'}>
            {r.balance_days}
          </span>
        )
    },
    { key: 'status', header: 'Status', width: 92, wrap: true, render: (r) => <StatusPill status={r.status} /> },
    { key: 'on_site', header: 'On Site', width: 104, wrap: true, render: (r) => <OnSitePill value={r.on_site} /> },
    { key: 'days_consumed', header: 'Days Consumed', width: 90, wrap: true, align: 'right', tabular: true, render: (r) => (r.days_consumed ?? '—') }
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Slicer */}
      <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-white to-[#eeecf8] p-3 shadow-card">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-heading text-[16px] font-bold text-slate-800">Work Orders</div>
              <div className="text-[12.5px] text-slate-500">Track &amp; manage — {enriched.length} total</div>
            </div>
          </div>

          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 w-full border-slate-300 bg-white pl-9 shadow-sm focus:shadow"
              placeholder="Search work orders......"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Segmented<'all' | 'Running' | 'Expired'>
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'Running', label: 'Running' },
              { value: 'Expired', label: 'Expired' }
            ]}
          />

          <div className="ml-auto flex items-center gap-2">
            <DownloadMenu build={buildDownload} />
            <button
              className="btn-teal"
              onClick={importExcel}
              disabled={importing}
              title="Import work orders from an Excel file"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importing…' : 'Import Excel'}
            </button>
          </div>
        </div>

        {/* horizontally scrollable WO chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setPickedWo(null)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition',
              !pickedWo
                ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400'
            )}
          >
            <Layers className="h-3.5 w-3.5" /> All
          </button>
          {enriched.map((r) => {
            const active = pickedWo === r.work_order_no
            const dot =
              r.status === 'Expired'
                ? 'bg-rose-500'
                : r.status === 'Running'
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
            return (
              <button
                key={r.id}
                onClick={() => setPickedWo(active ? null : r.work_order_no)}
                title={r.name_of_work || r.work_order_no}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} />
                <span className="tabular">{r.work_order_no}</span>
                <span className="max-w-[130px] truncate font-medium text-slate-400">
                  {r.name_of_work || ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          rows={filtered}
          minWidth={1900}
          showTotals
          uniformText
          onRowDoubleClick={(_i, r) => beginEdit(r)}
          rowActions={(r) => (
            <div className="flex items-center justify-center gap-1">
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

      {/* Create / Edit form */}
      <div className="card shrink-0 overflow-auto p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold uppercase tracking-wide text-brand-700">
            <ClipboardList className="h-5 w-5 shrink-0" />
            {editId ? 'Edit Work Order' : 'Create Work Order'}
          </h2>
          <div className="tabular flex flex-wrap gap-4 text-[13px] text-slate-500">
            <span>WO Value <b className="text-slate-800">₹ {formatAmt(totals.v)}</b></span>
            <span>Executed <b className="text-slate-800">₹ {formatAmt(totals.e)}</b></span>
            <span>Balance <b className={totals.b < 0 ? 'text-rose-600' : 'text-emerald-700'}>₹ {formatAmt(totals.b)}</b></span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name of Work" className="lg:col-span-2">
            <TextInput value={form.name_of_work} onChange={(e) => set('name_of_work', e.target.value)} />
          </Field>
          <Field label="Job Location">
            <TextInput value={form.job_location} onChange={(e) => set('job_location', e.target.value)} />
          </Field>
          <Field label="Work Order No">
            <TextInput className="tabular" value={form.work_order_no} onChange={(e) => set('work_order_no', e.target.value)} />
          </Field>
          <Field label="WO Date">
            <DateInput iso={form.wo_date} onISO={(v) => set('wo_date', v)} />
          </Field>
          <Field label="WO Value">
            <NumberInput value={form.wo_value} onValue={(v) => set('wo_value', v)} />
          </Field>
          <Field label="Executed Value (from invoices)">
            <TextInput
              readOnlyLook
              readOnly
              className="tabular text-right font-semibold"
              value={formatAmt(execMap[form.work_order_no.trim()] ?? 0)}
            />
          </Field>
          <Field label="Period">
            <div className="flex gap-2">
              <NumberInput
                className="flex-1"
                value={form.period_months}
                onValue={(v) => set('period_months', v)}
              />
              <div className="w-28 shrink-0">
                <Select
                  value={form.period_unit}
                  onChange={(v) => set('period_unit', v)}
                  options={PERIOD_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </div>
            </div>
          </Field>
          <Field label="Site Handover Date">
            <DateInput iso={form.site_handover_date} onISO={(v) => set('site_handover_date', v)} />
          </Field>
          <Field label="Revised Handover Date">
            <DateInput
              iso={form.revised_handover_date}
              onISO={(v) => set('revised_handover_date', v)}
            />
          </Field>
          <Field label="On Site Status">
            <Select
              value={form.on_site}
              onChange={(v) => set('on_site', v)}
              options={ON_SITE.map((o) => ({ value: o, label: o }))}
            />
          </Field>
          <Field label="Remarks" className="lg:col-span-2">
            <TextInput value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </Field>

          <div className="flex items-end gap-2">
            <button className={editId ? 'btn-primary flex-1' : 'btn-green flex-1'} onClick={save}>
              {editId ? <RefreshCw className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {editId ? 'Update' : 'Save'}
            </button>
            <button className="btn-red flex-1" onClick={clear}>
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }): React.JSX.Element {
  const cls =
    status === 'Running'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'Expired'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-slate-100 text-slate-500'
  return <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${cls}`}>{status}</span>
}

function OnSitePill({ value }: { value: string | null }): React.JSX.Element {
  const v = value || '—'
  const cls =
    v === 'Completed'
      ? 'bg-emerald-100 text-emerald-700'
      : v === 'Under final'
        ? 'bg-amber-100 text-amber-700'
        : v === 'In Process'
          ? 'bg-brand-100 text-brand-700'
          : 'bg-slate-100 text-slate-500'
  return <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${cls}`}>{v}</span>
}
