import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { OutstandingRow } from '../lib/types'
import { formatAmt, todayISO } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'

export default function WoOutstanding(): React.JSX.Element {
  const [rows, setRows] = useState<OutstandingRow[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    window.api.ded.outstanding().then(setRows)
  }, [])

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim()
    if (!t) return rows
    return rows.filter(
      (r) =>
        r.work_order_no.toLowerCase().includes(t) || (r.wo_name || '').toLowerCase().includes(t)
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

  return (
    <div className="flex h-full gap-4">
      {/* left: table */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            className="input max-w-xs text-[15px]"
            placeholder="Search work order…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <DownloadMenu build={buildDownload} />
          <div className="ml-auto text-[16px] text-slate-500">{filtered.length} work orders</div>
        </div>

        <div className="card min-h-0 flex-1 overflow-auto p-0">
          <table className="w-full border-collapse" style={{ minWidth: 780 }}>
            <thead className="sticky top-0 z-10">
              <tr className="app-gradient text-left text-[13.5px] uppercase tracking-wide text-white">
                <th className="w-10 px-3 py-3"></th>
                <th className="px-4 py-3 font-heading font-semibold">Work Order</th>
                <th className="px-4 py-3 font-heading font-semibold">Name of WO</th>
                <th className="px-4 py-3 text-right font-heading font-semibold">
                  <HeadDot color="bg-rose-400">SD Balance</HeadDot>
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold">
                  <HeadDot color="bg-fuchsia-300">HSE Balance</HeadDot>
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold">
                  <HeadDot color="bg-teal-300">PRS Balance</HeadDot>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const open = expanded === r.work_order_no
                return (
                  <ExpandableRow
                    key={r.work_order_no}
                    r={r}
                    i={i}
                    open={open}
                    onToggle={() =>
                      setExpanded((cur) => (cur === r.work_order_no ? null : r.work_order_no))
                    }
                  />
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[15px] text-slate-400">
                    No outstanding work orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* right: totals */}
      <div className="flex w-72 flex-col gap-4">
        <h2 className="font-heading text-lg font-bold text-slate-700">Outstanding Totals</h2>
        <BigStat label="SD Total" value={totals.sd} color="from-rose-500 to-red-500" />
        <BigStat label="HSE Total" value={totals.hse} color="from-brand-600 to-brand-500" />
        <BigStat label="PRS Total" value={totals.prs} color="from-teal-600 to-cyan-600" />
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          Click any row to see the debit (Dr) and credit (Cr) breakdown. Balances are total debits
          minus total credits across the deduction ledger.
        </p>
      </div>
    </div>
  )
}

function HeadDot({ color, children }: { color: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </span>
  )
}

// Colored pill for a non-zero balance; muted for zero; red for negative.
function BalancePill({ v, accent }: { v: number; accent: 'rose' | 'brand' | 'teal' }): React.JSX.Element {
  const rounded = Math.round(v * 100) / 100
  if (rounded === 0) return <span className="tabular text-[16.5px] text-slate-300">0.00</span>
  if (rounded < 0)
    return (
      <span className="tabular inline-block rounded-md bg-rose-50 px-2 py-0.5 text-[16.5px] font-semibold text-rose-600">
        {formatAmt(v)}
      </span>
    )
  const tint = {
    rose: 'bg-rose-50 text-rose-700',
    brand: 'bg-brand-50 text-brand-700',
    teal: 'bg-teal-50 text-teal-700'
  }[accent]
  return (
    <span className={`tabular inline-block rounded-md px-2 py-0.5 text-[16.5px] font-semibold ${tint}`}>
      {formatAmt(v)}
    </span>
  )
}

function ExpandableRow({
  r,
  i,
  open,
  onToggle
}: {
  r: OutstandingRow
  i: number
  open: boolean
  onToggle: () => void
}): React.JSX.Element {
  const stripe = i % 2 ? 'bg-brand-50/40' : 'bg-white'
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-t border-slate-100 transition hover:bg-brand-50 ${
          open ? 'bg-brand-100/70' : stripe
        }`}
      >
        <td className="px-3 py-3 text-slate-400">
          <ChevronRight
            className={`h-4.5 w-4.5 transition-transform ${open ? 'rotate-90 text-brand-600' : ''}`}
          />
        </td>
        <td className="tabular px-4 py-3 text-[16.5px] font-semibold text-slate-800">
          {r.work_order_no}
        </td>
        <td className="max-w-[280px] truncate px-4 py-3 text-[16.5px] font-semibold text-slate-700">
          {r.wo_name || '—'}
        </td>
        <td className="px-4 py-3 text-right">
          <BalancePill v={r.sd_balance} accent="rose" />
        </td>
        <td className="px-4 py-3 text-right">
          <BalancePill v={r.hse_balance} accent="brand" />
        </td>
        <td className="px-4 py-3 text-right">
          <BalancePill v={r.prs_balance} accent="teal" />
        </td>
      </tr>
      {open && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td></td>
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <LedgerCard
                label="SD"
                debit={r.sd_debit}
                credit={r.sd_credit}
                balance={r.sd_balance}
                accent="rose"
              />
              <LedgerCard
                label="HSE"
                debit={r.hse_debit}
                credit={r.hse_credit}
                balance={r.hse_balance}
                accent="brand"
              />
              <LedgerCard
                label="PRS"
                debit={r.prs_debit}
                credit={r.prs_credit}
                balance={r.prs_balance}
                accent="teal"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const ACCENTS: Record<string, { bar: string; chip: string }> = {
  rose: { bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-700' },
  brand: { bar: 'bg-brand-500', chip: 'bg-brand-100 text-brand-700' },
  teal: { bar: 'bg-teal-500', chip: 'bg-teal-100 text-teal-700' }
}

function LedgerCard({
  label,
  debit,
  credit,
  balance,
  accent
}: {
  label: string
  debit: number
  credit: number
  balance: number
  accent: keyof typeof ACCENTS
}): React.JSX.Element {
  const a = ACCENTS[accent]
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${a.bar}`} />
        <span className="font-heading text-[15px] font-bold text-slate-700">{label}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${a.chip}`}>
          Ledger
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        <LedgerLine label="Debit (Dr)" value={debit} />
        <LedgerLine label="Credit (Cr)" value={credit} />
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[14.5px] font-semibold text-slate-600">Balance</span>
          <span
            className={`tabular text-[16px] font-bold ${
              balance < 0 ? 'text-rose-600' : 'text-slate-800'
            }`}
          >
            ₹ {formatAmt(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

function LedgerLine({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-[14.5px] text-slate-500">{label}</span>
      <span className="tabular text-[15px] font-semibold text-slate-700">₹ {formatAmt(value)}</span>
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
