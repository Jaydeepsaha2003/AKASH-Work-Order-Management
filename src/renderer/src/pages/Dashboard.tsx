import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Receipt,
  Wallet,
  FileText,
  CalendarClock,
  ShieldAlert,
  CircleDollarSign,
  RefreshCw,
  CalendarDays,
  XCircle,
  CalendarRange
} from 'lucide-react'
import type { WorkOrder, OutstandingRow, Page } from '../lib/types'
import { formatAmt, formatCompactINR, formatDate, todayISO } from '../lib/format'
import { DateInput, Segmented } from '../components/ui'

type Preset = 'month' | 'fy' | 'all' | 'custom'

// days between an ISO date and today
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const ms = Date.now() - d.getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

function fyRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const startYear = now.getMonth() + 1 >= 4 ? y : y - 1
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` }
}

function monthRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-based
  const pad = (n: number): string => String(n + 1).padStart(2, '0')
  const last = new Date(y, m + 1, 0).getDate()
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${String(last).padStart(2, '0')}` }
}

export default function Dashboard({
  username,
  onNavigate
}: {
  username: string
  onNavigate: (p: Page) => void
}): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [out, setOut] = useState<OutstandingRow[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preset, setPreset] = useState<Preset>('all')

  function applyPreset(p: Preset): void {
    setPreset(p)
    if (p === 'month') {
      const r = monthRange()
      setFrom(r.from)
      setTo(r.to)
    } else if (p === 'fy') {
      const r = fyRange()
      setFrom(r.from)
      setTo(r.to)
    } else if (p === 'all') {
      setFrom('')
      setTo('')
    }
  }

  async function reload(): Promise<void> {
    const [wo, o] = await Promise.all([window.api.wo.list(), window.api.ded.outstanding()])
    setRows(wo)
    setOut(o)
  }
  useEffect(() => {
    reload()
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 12) return 'Good morning'
    if (h >= 12 && h < 16) return 'Good afternoon'
    return 'Good evening'
  }, [])

  // rows within the selected date range (by invoice date)
  const inRange = useMemo(() => {
    if (!from && !to) return rows
    return rows.filter((r) => {
      const d = r.invoice_date || ''
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }, [rows, from, to])

  const m = useMemo(() => {
    const turnover = inRange.reduce((s, r) => s + r.gross_value, 0) // excl GST
    const gst = inRange.reduce((s, r) => s + r.gst_on_gross, 0)
    const landed = inRange.reduce((s, r) => s + r.total_amt, 0)
    const cancelled = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'cancelled')
    const received = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'received')
    const created = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'created')

    // current calendar month invoices (independent of the range filter)
    const mr = monthRange()
    const monthRows = rows.filter(
      (r) => r.invoice_date && r.invoice_date >= mr.from && r.invoice_date <= mr.to
    )
    const monthCount = monthRows.length
    const monthValueExGst = monthRows.reduce((s, r) => s + r.gross_value, 0)

    // SD / HSE / PRS pending till date (all-time outstanding)
    const sd = out.reduce((s, o) => s + o.sd_balance, 0)
    const hse = out.reduce((s, o) => s + o.hse_balance, 0)
    const prs = out.reduce((s, o) => s + o.prs_balance, 0)

    // Turnover by financial year (all data)
    const byFy = new Map<string, number>()
    for (const r of rows) byFy.set(r.fin_year, (byFy.get(r.fin_year) || 0) + r.gross_value)
    const fyData = [...byFy.entries()]
      .filter(([k]) => k)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }))

    // Pending invoices (status Created) with days pending, most overdue first
    const pending = rows
      .filter((r) => (r.wo_status || '').toLowerCase() === 'created')
      .map((r) => ({ r, days: daysSince(r.invoice_date) ?? 0 }))
      .sort((a, b) => b.days - a.days)

    const pendingValue = pending.reduce((s, p) => s + p.r.total_amt, 0)

    return {
      turnover,
      gst,
      landed,
      cancelled,
      received,
      created,
      monthCount,
      monthValueExGst,
      sd,
      hse,
      prs,
      fyData,
      pending,
      pendingValue
    }
  }, [inRange, rows, out])

  const weekday = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
  const today = `${weekday}, ${formatDate(todayISO())}`

  const rangeLabel = !from && !to ? 'All time' : `${formatDate(from) || '…'} → ${formatDate(to) || '…'}`

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="space-y-4 pb-4">
        {/* Hero */}
        <div className="app-gradient relative overflow-hidden rounded-2xl px-7 py-6 text-white shadow-glow">
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[15px] text-white/75">
                <CalendarDays className="h-4 w-4" /> {today}
              </div>
              <h1 className="mt-1 font-heading text-3xl font-bold">
                {greeting}, {username}! 👋
              </h1>
              <p className="mt-1 text-[16px] text-white/80">Showing data for: {rangeLabel}</p>
            </div>
            <button
              onClick={reload}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-[15px] font-semibold backdrop-blur transition hover:bg-white/25"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Date range filter */}
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-heading text-[15px] font-semibold text-slate-800">Date range</div>
              <div className="text-[12.5px] text-slate-400">Filters by invoice date</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-44">
              <DateInput
                iso={from}
                onISO={(v) => {
                  setFrom(v)
                  setPreset('custom')
                }}
              />
            </div>
            <span className="text-slate-300">→</span>
            <div className="w-44">
              <DateInput
                iso={to}
                onISO={(v) => {
                  setTo(v)
                  setPreset('custom')
                }}
              />
            </div>
          </div>

          <div className="ml-auto">
            <Segmented<Preset>
              value={preset}
              onChange={applyPreset}
              options={[
                { value: 'month', label: 'This Month' },
                { value: 'fy', label: 'This FY' },
                { value: 'all', label: 'All Time' },
                ...(preset === 'custom' ? [{ value: 'custom' as Preset, label: 'Custom' }] : [])
              ]}
            />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            icon={TrendingUp}
            label="Turnover (excl GST)"
            value={`₹ ${formatCompactINR(m.turnover)}`}
            sub={`${inRange.length} invoices in range`}
            tint="from-brand-600 to-brand-500"
          />
          <Kpi
            icon={Receipt}
            label="This Month Invoices"
            value={String(m.monthCount)}
            sub={`₹ ${formatCompactINR(m.monthValueExGst)} excl GST`}
            tint="from-indigo-600 to-blue-500"
          />
          <Kpi
            icon={XCircle}
            label="Cancelled Invoices"
            value={String(m.cancelled.length)}
            sub="in selected range"
            tint="from-rose-600 to-red-500"
          />
          <Kpi
            icon={FileText}
            label="Work Orders"
            value={String(inRange.length)}
            sub={`${m.received.length} received · ${m.created.length} pending`}
            tint="from-fuchsia-600 to-pink-500"
          />
        </div>

        {/* SD / HSE / PRS pending till date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PendingCard label="SD Pending (till date)" value={m.sd} color="from-rose-500 to-red-500" icon={ShieldAlert} />
          <PendingCard label="HSE Pending (till date)" value={m.hse} color="from-brand-600 to-brand-500" icon={ShieldAlert} />
          <PendingCard label="PRS Pending (till date)" value={m.prs} color="from-teal-600 to-cyan-600" icon={CircleDollarSign} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Turnover by Financial Year" icon={TrendingUp} className="lg:col-span-2">
            <BarChart data={m.fyData} />
          </Panel>
          <Panel title="Work Order Status (in range)" icon={CircleDollarSign}>
            <StatusDonut
              created={m.created.length}
              received={m.received.length}
              cancelled={m.cancelled.length}
            />
          </Panel>
        </div>

        {/* Pending invoices with pending days */}
        <Panel
          title="Pending Invoices — with pending days"
          icon={CalendarClock}
          right={
            <button
              onClick={() => onNavigate('invoice')}
              className="text-[14px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Update invoices →
            </button>
          }
        >
          {m.pending.length === 0 ? (
            <Empty text="No pending invoices 🎉" />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-4 text-[14px] text-slate-500">
                <span>
                  <b className="text-slate-700">{m.pending.length}</b> pending
                </span>
                <span>
                  Worth <b className="tabular text-slate-700">₹ {formatAmt(m.pendingValue)}</b>
                </span>
              </div>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-100">
                <table className="w-full text-[14px]" style={{ minWidth: 720 }}>
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-heading font-semibold">Work Order</th>
                      <th className="px-3 py-2 font-heading font-semibold">Name</th>
                      <th className="px-3 py-2 font-heading font-semibold">Invoice</th>
                      <th className="px-3 py-2 font-heading font-semibold">Invoice Date</th>
                      <th className="px-3 py-2 text-right font-heading font-semibold">Total</th>
                      <th className="px-3 py-2 text-right font-heading font-semibold">Days Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.pending.map(({ r, days }) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-700">{r.work_order_no}</td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-slate-500">
                          {r.wo_name || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.invoice_no}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(r.invoice_date) || '—'}</td>
                        <td className="tabular px-3 py-2 text-right font-semibold text-slate-700">
                          {formatAmt(r.total_amt)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`tabular rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                              days > 60
                                ? 'bg-rose-100 text-rose-700'
                                : days > 30
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {days} day{days === 1 ? '' : 's'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ---------- building blocks ---------- */

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tint
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub: string
  tint: string
}): React.JSX.Element {
  return (
    <div className="card relative overflow-hidden p-4">
      <div className={`absolute right-0 top-0 h-20 w-20 bg-gradient-to-br ${tint} opacity-10 blur-xl`} />
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white shadow-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[14px] font-medium text-slate-500">{label}</div>
      <div className="tabular font-heading text-2xl font-bold text-slate-800">{value}</div>
      <div className="mt-0.5 text-[13px] text-slate-400">{sub}</div>
    </div>
  )
}

function PendingCard({
  label,
  value,
  color,
  icon: Icon
}: {
  label: string
  value: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}): React.JSX.Element {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-glow`}>
      <Icon className="absolute right-3 top-3 h-8 w-8 text-white/20" />
      <div className="text-[14px] uppercase tracking-wide text-white/80">{label}</div>
      <div className="tabular mt-1 font-heading text-2xl font-bold">₹ {formatAmt(value)}</div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  className,
  right
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
  right?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={`card p-4 ${className ?? ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="font-heading text-[16px] font-semibold text-slate-800">{title}</h3>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number }[] }): React.JSX.Element {
  if (data.length === 0) return <Empty text="No data yet" />
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex h-56 items-end justify-around gap-3 pt-6">
      {data.map((d) => {
        const h = Math.max((d.value / max) * 100, 2)
        return (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="tabular text-[13px] font-semibold text-slate-600">
              {formatCompactINR(d.value)}
            </div>
            <div
              className="w-full max-w-[64px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
              style={{ height: `${h}%` }}
              title={`₹ ${formatAmt(d.value)}`}
            />
            <div className="text-[13px] font-medium text-slate-500">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function StatusDonut({
  created,
  received,
  cancelled
}: {
  created: number
  received: number
  cancelled: number
}): React.JSX.Element {
  const total = created + received + cancelled
  const r = 54
  const c = 2 * Math.PI * r
  const segs = [
    { value: received, color: '#10b981', label: 'Received' },
    { value: created, color: '#f59e0b', label: 'Pending' },
    { value: cancelled, color: '#f43f5e', label: 'Cancelled' }
  ]
  let acc = 0
  return (
    <div className="flex items-center justify-around gap-4">
      <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
        <circle cx="75" cy="75" r={r} fill="none" stroke="#eef0f4" strokeWidth="18" />
        {total > 0 &&
          segs.map((s) => {
            const frac = s.value / total
            const dash = frac * c
            const el = (
              <circle
                key={s.label}
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc}
              />
            )
            acc += dash
            return el
          })}
      </svg>
      <div className="space-y-2">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[14px]">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="tabular ml-auto font-semibold text-slate-800">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }): React.JSX.Element {
  return <div className="py-8 text-center text-[15px] text-slate-400">{text}</div>
}
