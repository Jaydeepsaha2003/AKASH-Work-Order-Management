import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Filter, CalendarRange, Pencil, RefreshCw } from 'lucide-react'
import type { WorkOrder } from '../lib/types'
import {
  DataTable,
  DateInput,
  Select,
  Modal,
  Field,
  TextInput,
  NumberInput,
  type Column
} from '../components/ui'
import { formatAmt, formatDate, toNum, todayISO, errText, fail } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'
import { StatusBadge } from './CreateWO'

const blankEdit = {
  work_order_no: '',
  invoice_no: '',
  start_date: '',
  end_date: '',
  invoice_date: '',
  gross_value: '',
  gst_per: '',
  gst_amt: '',
  wo_name: ''
}

const HEADERS = [
  'Financial Year',
  'Entry Date',
  'Work Order',
  'Name of WO',
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
  'Income Tax',
  'GST 2%',
  'E. Cem Bag & Others',
  'Labour Cess',
  'Penalty/Water & Elec',
  'Land Rent',
  'Gst (Rent & Penalty)',
  'Other & Round off',
  'With Hold/HSE',
  'Price Deduction',
  'SD Amt',
  'Net Amount'
]

function toRow(r: WorkOrder): (string | number)[] {
  return [
    r.fin_year,
    formatDate(r.entry_date),
    r.work_order_no,
    r.wo_name || '',
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
    r.income_tax,
    r.gst_2,
    r.cem_bags,
    r.labour_cess,
    r.penalty,
    r.land_rent,
    r.gst_rent_penalty,
    r.round_off,
    r.hse,
    r.price_deduction,
    r.sd_amt,
    r.net_amount
  ]
}

// numeric column indexes for subtotals: Gross(9) GST(10) Total(11) then 14..25
const SUBTOTAL_COLS = [9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]

// "2022-23" → { from: 2022-04-01, to: 2023-03-31 }
function fyToRange(fy: string): { from: string; to: string } | null {
  const m = fy.match(/^(\d{4})-\d{2}$/)
  if (!m) return null
  const sy = parseInt(m[1], 10)
  return { from: `${sy}-04-01`, to: `${sy + 1}-03-31` }
}

export default function ViewDetails(): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [fyValue, setFyValue] = useState('')

  // per-row invoice edit (modal)
  const [editing, setEditing] = useState<WorkOrder | null>(null)
  const [form, setForm] = useState({ ...blankEdit })
  const [woStatus, setWoStatus] = useState('Created')
  const [cancelRemarks, setCancelRemarks] = useState('')

  async function reload(): Promise<void> {
    setRows(await window.api.wo.list())
  }
  useEffect(() => {
    reload()
  }, [])

  const editTotal = useMemo(() => {
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

  function beginEdit(r: WorkOrder): void {
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
  }

  function setF<K extends keyof typeof form>(k: K, v: (typeof form)[K]): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function saveEdit(): Promise<void> {
    if (!editing) return
    if (editTotal === 'ERR') return fail('Please enter either GST % or GST Amount, not both.')
    if (!form.invoice_no.trim()) return fail('Invoice No is required.')
    try {
      const res = await window.api.wo.update({
        id: editing.id,
        fin_year: editing.fin_year,
        work_order_no: form.work_order_no,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        invoice_no: form.invoice_no.trim(),
        invoice_date: form.invoice_date || null,
        gross_value: toNum(form.gross_value),
        total_amt: toNum(editTotal === 'ERR' ? '0' : editTotal),
        wo_name: form.wo_name || null,
        wo_status: woStatus,
        cancel_remarks: cancelRemarks || null
      })
      if (res.ok) {
        toast.success(res.message)
        setEditing(null)
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  // financial years present in the data (newest first)
  const availableFYs = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.fin_year) set.add(r.fin_year)
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])

  function pickFY(fy: string): void {
    setFyValue(fy)
    const r = fyToRange(fy)
    if (r) {
      setFrom(r.from)
      setTo(r.to)
    }
  }
  function setRangeFrom(v: string): void {
    setFrom(v)
    setFyValue('')
  }
  function setRangeTo(v: string): void {
    setTo(v)
    setFyValue('')
  }
  function clearFilters(): void {
    setFrom('')
    setTo('')
    setFyValue('')
  }

  const filtered = useMemo(() => {
    // date range by invoice date
    let base = rows
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
    return base.filter((r) =>
      terms.every((t) => toRow(r).join(' ').toLowerCase().replace(/\s/g, '').includes(t))
    )
  }, [rows, search, from, to])

  const totals = useMemo(() => {
    let sd = 0,
      hse = 0,
      prs = 0
    for (const r of filtered) {
      sd += r.sd_amt
      hse += r.hse
      prs += r.price_deduction
    }
    return { sd, hse, prs }
  }, [filtered])

  function buildFull(): DownloadPayload {
    return {
      title: 'Work Order Details',
      defaultBase: `WO_Details_${todayISO()}`,
      headers: HEADERS,
      rows: filtered.map(toRow),
      subtotalCols: SUBTOTAL_COLS
    }
  }

  function buildDeductions(): DownloadPayload {
    const only = filtered.filter((r) => r.hse !== 0 || r.price_deduction !== 0 || r.sd_amt !== 0)
    return {
      title: 'Deduction Report',
      defaultBase: `Deduction_Report_${todayISO()}`,
      headers: HEADERS,
      rows: only.map(toRow),
      subtotalCols: SUBTOTAL_COLS
    }
  }

  const money = (k: keyof WorkOrder): Column<WorkOrder> => ({
    key: k as string,
    header: '',
    numeric: true,
    width: 105,
    render: (r) => formatAmt(r[k] as number)
  })

  const columns: Column<WorkOrder>[] = [
    { key: 'fin_year', header: 'Fin Year', width: 78, tabular: true },
    { key: 'work_order_no', header: 'Work Order', width: 95, tabular: true },
    { key: 'wo_name', tabular: true, header: 'Name of WO', width: 150, render: (r) => r.wo_name || '' },
    { key: 'invoice_no', header: 'Inv No', width: 65, tabular: true },
    { key: 'invoice_date', header: 'Inv Date', width: 96, tabular: true, render: (r) => formatDate(r.invoice_date) },
    { key: 'rec_date', header: 'Rec Date', width: 96, tabular: true, render: (r) => formatDate(r.rec_date) },
    { ...money('gross_value'), header: 'Gross Value' },
    { ...money('gst_on_gross'), header: 'GST/Gross' },
    { ...money('total_amt'), header: 'Total Amt' },
    { key: 'wo_status', header: 'Status', width: 88, render: (r) => <StatusBadge status={r.wo_status} /> },
    { ...money('income_tax'), header: 'Income Tax' },
    { ...money('gst_2'), header: 'GST 2%' },
    { ...money('cem_bags'), header: 'Cem Bag/Other' },
    { ...money('labour_cess'), header: 'Labour Cess' },
    { ...money('penalty'), header: 'Penalty/W&E' },
    { ...money('land_rent'), header: 'Land Rent' },
    { ...money('gst_rent_penalty'), header: 'GST Rent&Pen' },
    { ...money('round_off'), header: 'Other/Round' },
    { ...money('hse'), header: 'WithHold/HSE' },
    { ...money('price_deduction'), header: 'Price Deduct' },
    { ...money('sd_amt'), header: 'SD Amt' },
    { ...money('net_amount'), header: 'Net Amount' }
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative w-52 shrink-0">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 w-full border-slate-300 bg-white pl-9 shadow-sm focus:shadow"
            placeholder="Search ...."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DownloadMenu build={buildFull} label="Download Full" />
        <DownloadMenu build={buildDeductions} label="Deduction Only" variant="ghost" />

        <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />

        <CalendarRange className="h-4 w-4 shrink-0 text-brand-600" />
        <span className="shrink-0 text-[13px] font-semibold text-slate-500">FY</span>
        <div className="w-40 shrink-0">
          <Select
            value={fyValue}
            onChange={pickFY}
            options={availableFYs.map((f) => ({ value: f, label: `FY ${f}` }))}
            placeholder="All"
          />
        </div>
        <div className="w-32 shrink-0">
          <DateInput iso={from} onISO={setRangeFrom} />
        </div>
        <span className="shrink-0 text-slate-300">–</span>
        <div className="w-32 shrink-0">
          <DateInput iso={to} onISO={setRangeTo} />
        </div>
        {(from || to || fyValue) && (
          <button
            onClick={clearFilters}
            className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-brand-600"
          >
            Clear
          </button>
        )}

        <div className="ml-auto shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-[15px] font-semibold text-brand-700">
          {filtered.length} record{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          rows={filtered}
          minWidth={2100}
          defaultSort={[
            { key: 'fin_year', dir: 'desc' },
            { key: 'invoice_no', dir: 'asc' }
          ]}
          onRowDoubleClick={(_i, r) => beginEdit(r)}
          rowActions={(r) => (
            <button
              title="Edit invoice"
              onClick={() => beginEdit(r)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-brand-600 transition hover:bg-brand-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TotalCard label="SD Amt Total" value={totals.sd} color="from-rose-500 to-red-500" />
        <TotalCard label="With Hold / HSE Total" value={totals.hse} color="from-brand-600 to-brand-500" />
        <TotalCard label="Price Deduction Total" value={totals.prs} color="from-teal-600 to-cyan-600" />
      </div>

      {/* Per-row invoice edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Invoice"
        icon={Pencil}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={saveEdit}>
              <RefreshCw className="h-4 w-4" /> Update
            </button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-lg bg-brand-50 px-2.5 py-1 font-heading font-semibold text-brand-700">
            FY {editing?.fin_year}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-heading font-semibold text-slate-600">
            WO {editing?.work_order_no}
          </span>
          <span className="text-slate-400">Fin-Year & Work Order No are locked.</span>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Work Order No">
            <TextInput readOnlyLook readOnly className="tabular" value={form.work_order_no} />
          </Field>
          <Field label="Invoice No">
            <TextInput
              className="tabular"
              value={form.invoice_no}
              onChange={(e) => setF('invoice_no', e.target.value)}
            />
          </Field>
          <Field label="Invoice Date">
            <DateInput iso={form.invoice_date} onISO={(v) => setF('invoice_date', v)} />
          </Field>
          <Field label="Work Start Date">
            <DateInput iso={form.start_date} onISO={(v) => setF('start_date', v)} />
          </Field>
          <Field label="Work End Date">
            <DateInput iso={form.end_date} onISO={(v) => setF('end_date', v)} />
          </Field>
          <Field label="Name of WO">
            <TextInput
              className="tabular"
              value={form.wo_name}
              onChange={(e) => setF('wo_name', e.target.value)}
            />
          </Field>
          <Field label="Gross Value">
            <NumberInput value={form.gross_value} onValue={(v) => setF('gross_value', v)} />
          </Field>
          <Field label="GST %">
            <NumberInput value={form.gst_per} onValue={(v) => setF('gst_per', v)} />
          </Field>
          <Field label="GST Amt">
            <NumberInput value={form.gst_amt} onValue={(v) => setF('gst_amt', v)} />
          </Field>
          <Field label="Total Amt">
            <TextInput
              readOnlyLook
              readOnly
              className="tabular text-right font-semibold"
              value={editTotal === 'ERR' ? '' : editTotal}
            />
          </Field>
          <Field label="WO Status">
            <Select
              value={woStatus}
              onChange={setWoStatus}
              options={[
                { value: 'Created', label: 'Created' },
                { value: 'Received', label: 'Received' },
                { value: 'Cancelled', label: 'Cancelled' }
              ]}
            />
          </Field>
          {woStatus === 'Cancelled' && (
            <Field label="Cancel Remarks">
              <TextInput
                value={cancelRemarks}
                onChange={(e) => setCancelRemarks(e.target.value)}
              />
            </Field>
          )}
        </div>
      </Modal>
    </div>
  )
}

function TotalCard({
  label,
  value,
  color
}: {
  label: string
  value: number
  color: string
}): React.JSX.Element {
  return (
    <div className={`rounded-xl bg-gradient-to-r ${color} px-5 py-3 text-white shadow-glow`}>
      <div className="text-[13px] uppercase tracking-wide text-white/80">{label}</div>
      <div className="tabular font-heading text-lg font-bold">₹ {formatAmt(value)}</div>
    </div>
  )
}
