import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import type { WorkOrder } from '../lib/types'
import { DataTable, type Column } from '../components/ui'
import { formatAmt, formatDate, todayISO } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'
import { StatusBadge } from './CreateWO'

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

export default function ViewDetails(): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.wo.list().then(setRows)
  }, [])

  const filtered = useMemo(() => {
    const terms = search.toLowerCase().replace(/\s/g, '').split(',').filter(Boolean)
    if (!terms.length) return rows
    return rows.filter((r) =>
      terms.every((t) =>
        toRow(r).join(' ').toLowerCase().replace(/\s/g, '').includes(t)
      )
    )
  }, [rows, search])

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
    { key: 'fin_year', header: 'Fin Year', width: 78 },
    { key: 'work_order_no', header: 'Work Order', width: 95 },
    { key: 'wo_name', header: 'Name of WO', width: 150, render: (r) => r.wo_name || '' },
    { key: 'invoice_no', header: 'Inv No', width: 65 },
    { key: 'invoice_date', header: 'Inv Date', width: 90, render: (r) => formatDate(r.invoice_date) },
    { key: 'rec_date', header: 'Rec Date', width: 90, render: (r) => formatDate(r.rec_date) },
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input w-72 pl-9"
            placeholder="Search everything…  (comma = AND)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DownloadMenu build={buildFull} label="Download Full" />
        <DownloadMenu build={buildDeductions} label="Deduction Only" variant="ghost" />
        <div className="ml-auto text-sm text-slate-500">
          {filtered.length} record{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} minWidth={2100} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TotalCard label="SD Amt Total" value={totals.sd} color="from-rose-500 to-red-500" />
        <TotalCard label="With Hold / HSE Total" value={totals.hse} color="from-brand-600 to-brand-500" />
        <TotalCard label="Price Deduction Total" value={totals.prs} color="from-teal-600 to-cyan-600" />
      </div>
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
      <div className="text-[12px] uppercase tracking-wide text-white/80">{label}</div>
      <div className="tabular font-heading text-lg font-bold">₹ {formatAmt(value)}</div>
    </div>
  )
}
