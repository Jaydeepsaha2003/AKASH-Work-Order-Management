import { useEffect, useMemo, useState } from 'react'
import type { OutstandingRow } from '../lib/types'
import { DataTable, type Column } from '../components/ui'
import { formatAmt, todayISO } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'

export default function WoOutstanding(): React.JSX.Element {
  const [rows, setRows] = useState<OutstandingRow[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.ded.outstanding().then(setRows)
  }, [])

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim()
    if (!t) return rows
    return rows.filter(
      (r) =>
        r.work_order_no.toLowerCase().includes(t) ||
        (r.wo_name || '').toLowerCase().includes(t)
    )
  }, [rows, search])

  const totals = useMemo(() => {
    let sd = 0,
      hse = 0,
      prs = 0
    for (const r of filtered) {
      sd += r.sd_balance
      hse += r.hse_balance
      prs += r.prs_balance
    }
    return { sd, hse, prs }
  }, [filtered])

  function buildDownload(): DownloadPayload {
    return {
      title: 'WO Outstanding',
      defaultBase: `WO_Outstanding_${todayISO()}`,
      headers: ['Work Order', 'Name of WO', 'SD Balance', 'HSE Balance', 'PRS Balance'],
      rows: filtered.map((r) => [
        r.work_order_no,
        r.wo_name || '',
        r.sd_balance,
        r.hse_balance,
        r.prs_balance
      ]),
      subtotalCols: [2, 3, 4],
      summary: [
        { label: 'SD Total', value: formatAmt(totals.sd) },
        { label: 'HSE Total', value: formatAmt(totals.hse) },
        { label: 'PRS Total', value: formatAmt(totals.prs) }
      ]
    }
  }

  const bal = (k: keyof OutstandingRow, header: string): Column<OutstandingRow> => ({
    key: k as string,
    header,
    numeric: true,
    width: 150,
    render: (r) => {
      const v = r[k] as number
      return <span className={v < 0 ? 'text-rose-600' : ''}>{formatAmt(v)}</span>
    }
  })

  const columns: Column<OutstandingRow>[] = [
    { key: 'work_order_no', header: 'Work Order', width: 130, tabular: true },
    { key: 'wo_name', tabular: true, header: 'Name of WO', width: 260, render: (r) => r.wo_name || '' },
    bal('sd_balance', 'SD Balance'),
    bal('hse_balance', 'HSE Balance'),
    bal('prs_balance', 'PRS Balance')
  ]

  return (
    <div className="flex h-full gap-4">
      {/* left: table */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search work order…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <DownloadMenu build={buildDownload} />
          <div className="ml-auto text-[16px] text-slate-500">{filtered.length} work orders</div>
        </div>
        <div className="min-h-0 flex-1">
          <DataTable columns={columns} rows={filtered} minWidth={760} />
        </div>
      </div>

      {/* right: totals */}
      <div className="flex w-72 flex-col gap-4">
        <h2 className="font-heading text-lg font-bold text-slate-700">Outstanding Totals</h2>
        <BigStat label="SD Total" value={totals.sd} color="from-rose-500 to-red-500" />
        <BigStat label="HSE Total" value={totals.hse} color="from-brand-600 to-brand-500" />
        <BigStat label="PRS Total" value={totals.prs} color="from-teal-600 to-cyan-600" />
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          Balances are computed per work order as total debits minus total credits across the
          deduction ledger.
        </p>
      </div>
    </div>
  )
}

function BigStat({
  label,
  value,
  color
}: {
  label: string
  value: number
  color: string
}): React.JSX.Element {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-glow`}>
      <div className="text-[14px] uppercase tracking-wide text-white/80">{label}</div>
      <div className="tabular mt-1 font-heading text-2xl font-bold">₹ {formatAmt(value)}</div>
    </div>
  )
}
