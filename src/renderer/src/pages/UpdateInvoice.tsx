import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save, Eraser, MousePointerClick, FilePlus2, Search, ReceiptText } from 'lucide-react'
import type { WorkOrder } from '../lib/types'
import { Field, TextInput, NumberInput, DateInput, DataTable, type Column } from '../components/ui'
import { formatAmt, formatDate, financialYear, toNum, todayISO, errText, fail } from '../lib/format'
import { StatusBadge } from './CreateWO'

const blankDed = {
  income_tax: '',
  hse: '',
  round_off: '',
  gst_2: '',
  cem_bags: '',
  labour_cess: '',
  sd_amt: '',
  penalty: '',
  land_rent: '',
  gst_rent_penalty: '',
  price_deduction: ''
}

export default function UpdateInvoice(): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [sel, setSel] = useState(-1)

  const [picked, setPicked] = useState<WorkOrder | null>(null)
  const [recDate, setRecDate] = useState(todayISO())
  const [ded, setDed] = useState({ ...blankDed })

  async function reload(): Promise<void> {
    setRows(await window.api.wo.list())
  }
  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const base = editMode ? rows : rows.filter((r) => (r.wo_status || '').toLowerCase() === 'created')
    const terms = search.toLowerCase().replace(/\s/g, '').split(',').filter(Boolean)
    if (!terms.length) return base
    return base.filter((r) => {
      const hay = [r.fin_year, r.work_order_no, r.invoice_no, r.wo_name, r.wo_status]
        .join(' ')
        .toLowerCase()
        .replace(/\s/g, '')
      return terms.every((t) => hay.includes(t))
    })
  }, [rows, search, editMode])

  const total = picked?.total_amt ?? 0
  const netAmount = useMemo(() => {
    const sum =
      toNum(ded.income_tax) +
      toNum(ded.hse) +
      toNum(ded.round_off) +
      toNum(ded.gst_2) +
      toNum(ded.land_rent) +
      toNum(ded.price_deduction) +
      toNum(ded.penalty) +
      toNum(ded.sd_amt) +
      toNum(ded.labour_cess) +
      toNum(ded.gst_rent_penalty) +
      toNum(ded.cem_bags)
    return total - sum
  }, [ded, total])

  const isEditingReceived = editMode && picked && (picked.wo_status || '').toLowerCase() === 'received'

  function pick(r: WorkOrder): void {
    setPicked(r)
    if (editMode && (r.wo_status || '').toLowerCase() === 'received') {
      // load existing deduction values for editing
      setRecDate(r.rec_date || todayISO())
      setDed({
        income_tax: String(r.income_tax || ''),
        hse: String(r.hse || ''),
        round_off: String(r.round_off || ''),
        gst_2: String(r.gst_2 || ''),
        cem_bags: String(r.cem_bags || ''),
        labour_cess: String(r.labour_cess || ''),
        sd_amt: String(r.sd_amt || ''),
        penalty: String(r.penalty || ''),
        land_rent: String(r.land_rent || ''),
        gst_rent_penalty: String(r.gst_rent_penalty || ''),
        price_deduction: String(r.price_deduction || '')
      })
      toast.info('Loaded received invoice for editing.')
    } else {
      setRecDate(todayISO())
      setDed({ ...blankDed })
      toast.success(`Selected WO ${r.work_order_no} / Inv ${r.invoice_no}. Enter deductions below.`)
    }
  }

  function clear(): void {
    setPicked(null)
    setDed({ ...blankDed })
    setRecDate(todayISO())
    setSel(-1)
  }

  async function save(): Promise<void> {
    if (!picked) return fail('Please double-click a work order from the list first.')
    const payload = {
      fin_year: picked.fin_year,
      work_order_no: picked.work_order_no,
      invoice_no: picked.invoice_no,
      rec_date: recDate || null,
      income_tax: toNum(ded.income_tax),
      hse: toNum(ded.hse),
      round_off: toNum(ded.round_off),
      gst_2: toNum(ded.gst_2),
      cem_bags: toNum(ded.cem_bags),
      labour_cess: toNum(ded.labour_cess),
      sd_amt: toNum(ded.sd_amt),
      penalty: toNum(ded.penalty),
      land_rent: toNum(ded.land_rent),
      gst_rent_penalty: toNum(ded.gst_rent_penalty),
      price_deduction: toNum(ded.price_deduction),
      net_amount: netAmount,
      total_amt: total
    }
    try {
      const res = isEditingReceived
        ? await window.api.inv.update(payload)
        : await window.api.inv.save(payload)
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  const columns: Column<WorkOrder>[] = [
    { key: 'fin_year', header: 'Fin-Year', width: 78, tabular: true },
    { key: 'work_order_no', header: 'Work Order', width: 95, tabular: true },
    { key: 'wo_name', tabular: true, header: 'Name of WO', width: 150, render: (r) => r.wo_name || '' },
    { key: 'invoice_no', header: 'Invoice No', width: 75, tabular: true },
    { key: 'invoice_date', header: 'Invoice Date', width: 96, tabular: true, render: (r) => formatDate(r.invoice_date) },
    { key: 'rec_date', header: 'Rec Date', width: 96, tabular: true, render: (r) => formatDate(r.rec_date) },
    { key: 'gross_value', header: 'Gross Value', width: 110, numeric: true, render: (r) => formatAmt(r.gross_value) },
    { key: 'total_amt', header: 'Total Amt', width: 115, numeric: true, render: (r) => formatAmt(r.total_amt) },
    { key: 'wo_status', header: 'WO Status', width: 90, render: (r) => <StatusBadge status={r.wo_status} /> }
  ]

  return (
    <div className="flex h-full gap-3">
      {/* LEFT: form column (fields stacked one per row) */}
      <div className="card flex w-[380px] shrink-0 flex-col overflow-hidden p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold uppercase tracking-wide leading-tight text-brand-700">
              <ReceiptText className="h-5 w-5 shrink-0" />
              {isEditingReceived ? 'Edit Received Invoice' : 'Enter Deductions'}
            </h2>
          </div>
          {picked && (
            <div className="mt-2 rounded-lg bg-brand-50 px-3 py-1.5 font-heading text-[12.5px] font-semibold text-brand-700">
              WO {picked.work_order_no} • Inv {picked.invoice_no} • FY{' '}
              {financialYear(picked.rec_date ? new Date(picked.rec_date) : new Date())}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Work Order No">
              <TextInput readOnlyLook readOnly className="tabular" value={picked?.work_order_no || ''} />
            </Field>
            <Field label="Received Date">
              <DateInput iso={recDate} onISO={setRecDate} />
            </Field>
            <Field label="GST Amt (2%)">
              <NumberInput value={ded.gst_2} onValue={(v) => setDed({ ...ded, gst_2: v })} />
            </Field>
            <Field label="Penalty / Water & Elec">
              <NumberInput value={ded.penalty} onValue={(v) => setDed({ ...ded, penalty: v })} />
            </Field>
            <Field label="E. Cem Bags & Others">
              <NumberInput value={ded.cem_bags} onValue={(v) => setDed({ ...ded, cem_bags: v })} />
            </Field>
            <Field label="Land Rent">
              <NumberInput value={ded.land_rent} onValue={(v) => setDed({ ...ded, land_rent: v })} />
            </Field>
            <Field label="Income Tax">
              <NumberInput value={ded.income_tax} onValue={(v) => setDed({ ...ded, income_tax: v })} />
            </Field>
            <Field label="Labour Cess">
              <NumberInput value={ded.labour_cess} onValue={(v) => setDed({ ...ded, labour_cess: v })} />
            </Field>
            <Field label="GST (Rent & Penalty)">
              <NumberInput
                value={ded.gst_rent_penalty}
                onValue={(v) => setDed({ ...ded, gst_rent_penalty: v })}
              />
            </Field>
            <Field label="WithHold / HSE">
              <NumberInput value={ded.hse} onValue={(v) => setDed({ ...ded, hse: v })} />
            </Field>
            <Field label="SD Amt">
              <NumberInput value={ded.sd_amt} onValue={(v) => setDed({ ...ded, sd_amt: v })} />
            </Field>
            <Field label="Price Deduct (PRS)">
              <NumberInput
                value={ded.price_deduction}
                onValue={(v) => setDed({ ...ded, price_deduction: v })}
              />
            </Field>
            <Field label="Round Off">
              <NumberInput value={ded.round_off} onValue={(v) => setDed({ ...ded, round_off: v })} />
            </Field>
            <Field label="Gross Amt (Total)">
              <TextInput readOnlyLook readOnly className="tabular text-right" value={formatAmt(total)} />
            </Field>
            <Field label="Net Amount">
              <TextInput
                readOnlyLook
                readOnly
                className="tabular text-right font-bold text-emerald-700"
                value={formatAmt(netAmount)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="btn-green flex-1" onClick={save}>
            <Save className="h-4 w-4" /> {isEditingReceived ? 'Update' : 'Save'}
          </button>
          <button className="btn-red flex-1" onClick={clear}>
            <Eraser className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      {/* RIGHT: toolbar + table */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 w-full border-slate-300 bg-white pl-9 shadow-sm focus:shadow"
              placeholder="Search work orders......"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => {
                setEditMode(e.target.checked)
                clear()
              }}
              className="h-4 w-4 accent-brand-600"
            />
            Edit Mode (edit received invoices)
          </label>
          <div className="flex items-center gap-1.5 text-[15px] text-slate-400">
            <MousePointerClick className="h-4 w-4" /> Click <b className="text-brand-600">Load</b> on a
            row to open it
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <DataTable
            columns={columns}
            rows={filtered}
            minWidth={900}
            selectedIndex={sel}
            onSelect={(i) => setSel(i)}
            actionsHeader="Action"
            rowActions={(r) => (
              <button
                title="Load for invoice entry"
                onClick={() => pick(r)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
              >
                <FilePlus2 className="h-4 w-4" /> Load
              </button>
            )}
          />
        </div>
      </div>
    </div>
  )
}
