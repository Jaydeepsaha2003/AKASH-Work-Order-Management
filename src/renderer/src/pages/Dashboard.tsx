import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Receipt,
  Landmark,
  Wallet,
  FileText,
  Bell,
  Clock,
  ShieldAlert,
  ArrowRight,
  CircleDollarSign,
  RefreshCw,
  CalendarDays,
  XCircle
} from 'lucide-react'
import type { WorkOrder, OutstandingRow, Page } from '../lib/types'
import { formatAmt, formatCompactINR, formatDate } from '../lib/format'
import { StatusBadge } from './CreateWO'

export default function Dashboard({
  username,
  onNavigate
}: {
  username: string
  onNavigate: (p: Page) => void
}): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [out, setOut] = useState<OutstandingRow[]>([])

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

  const m = useMemo(() => {
    const turnover = rows.reduce((s, r) => s + r.gross_value, 0)
    const gst = rows.reduce((s, r) => s + r.gst_on_gross, 0)
    const landed = rows.reduce((s, r) => s + r.total_amt, 0)
    const net = rows.reduce((s, r) => s + r.net_amount, 0)
    const created = rows.filter((r) => (r.wo_status || '').toLowerCase() === 'created')
    const received = rows.filter((r) => (r.wo_status || '').toLowerCase() === 'received')
    const cancelled = rows.filter((r) => (r.wo_status || '').toLowerCase() === 'cancelled')
    const pendingValue = created.reduce((s, r) => s + r.total_amt, 0)

    const sd = out.reduce((s, o) => s + o.sd_balance, 0)
    const hse = out.reduce((s, o) => s + o.hse_balance, 0)
    const prs = out.reduce((s, o) => s + o.prs_balance, 0)
    const withBalance = out.filter(
      (o) => Math.abs(o.sd_balance) + Math.abs(o.hse_balance) + Math.abs(o.prs_balance) > 0.01
    )

    // turnover by financial year
    const byFy = new Map<string, number>()
    for (const r of rows) byFy.set(r.fin_year, (byFy.get(r.fin_year) || 0) + r.gross_value)
    const fyData = [...byFy.entries()]
      .filter(([k]) => k)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }))

    const topOutstanding = [...withBalance]
      .sort(
        (a, b) =>
          b.sd_balance + b.hse_balance + b.prs_balance -
          (a.sd_balance + a.hse_balance + a.prs_balance)
      )
      .slice(0, 6)

    const recent = [...rows].sort((a, b) => b.id - a.id).slice(0, 7)

    return {
      turnover,
      gst,
      landed,
      net,
      created,
      received,
      cancelled,
      pendingValue,
      sd,
      hse,
      prs,
      withBalance,
      fyData,
      topOutstanding,
      recent
    }
  }, [rows, out])

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="space-y-4 pb-4">
        {/* Hero */}
        <div className="app-gradient relative overflow-hidden rounded-2xl px-7 py-6 text-white shadow-glow">
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-white/75">
                <CalendarDays className="h-4 w-4" /> {today}
              </div>
              <h1 className="mt-1 font-heading text-3xl font-bold">
                {greeting}, {username}! 👋
              </h1>
              <p className="mt-1 text-[15px] text-white/80">
                Here&apos;s the latest snapshot of your work orders and recoverables.
              </p>
            </div>
            <button
              onClick={reload}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Kpi
            icon={TrendingUp}
            label="Turnover"
            value={formatCompactINR(m.turnover)}
            sub={`${rows.length} invoices`}
            tint="from-brand-600 to-brand-500"
          />
          <Kpi
            icon={Receipt}
            label="GST Total"
            value={formatCompactINR(m.gst)}
            sub="on gross value"
            tint="from-violet-600 to-purple-500"
          />
          <Kpi
            icon={Landmark}
            label="Landed Amount"
            value={formatCompactINR(m.landed)}
            sub="incl. GST"
            tint="from-indigo-600 to-blue-500"
          />
          <Kpi
            icon={Wallet}
            label="Net Received"
            value={formatCompactINR(m.net)}
            sub="after deductions"
            tint="from-emerald-600 to-teal-500"
          />
          <Kpi
            icon={FileText}
            label="Work Orders"
            value={String(rows.length)}
            sub={`${m.received.length} received · ${m.created.length} open`}
            tint="from-fuchsia-600 to-pink-500"
          />
        </div>

        {/* Charts + status */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Turnover by Financial Year" icon={TrendingUp} className="lg:col-span-2">
            <BarChart data={m.fyData} />
          </Panel>
          <Panel title="Work Order Status" icon={CircleDollarSign}>
            <StatusDonut
              created={m.created.length}
              received={m.received.length}
              cancelled={m.cancelled.length}
            />
          </Panel>
        </div>

        {/* Reminders + Outstanding */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Reminders & Actions" icon={Bell} className="lg:col-span-1">
            <div className="space-y-3">
              <Reminder
                tone="amber"
                icon={Clock}
                title={`${m.created.length} invoice${m.created.length === 1 ? '' : 's'} awaiting receipt`}
                sub={`Worth ₹ ${formatAmt(m.pendingValue)} — mark them received`}
                onClick={() => onNavigate('invoice')}
              />
              <Reminder
                tone="rose"
                icon={ShieldAlert}
                title={`₹ ${formatCompactINR(m.sd)} SD recoverable`}
                sub={`${m.withBalance.length} work orders carry a balance`}
                onClick={() => onNavigate('outstanding')}
              />
              <Reminder
                tone="brand"
                icon={CircleDollarSign}
                title={`₹ ${formatCompactINR(m.hse)} HSE · ₹ ${formatCompactINR(m.prs)} PRS`}
                sub="Withheld / price-deduction balances"
                onClick={() => onNavigate('outstanding')}
              />
              {m.cancelled.length > 0 && (
                <Reminder
                  tone="slate"
                  icon={XCircle}
                  title={`${m.cancelled.length} cancelled work order${m.cancelled.length === 1 ? '' : 's'}`}
                  sub="Review under Create WO"
                  onClick={() => onNavigate('create')}
                />
              )}
            </div>
          </Panel>

          <Panel title="Top Outstanding Work Orders" icon={Wallet} className="lg:col-span-2">
            {m.topOutstanding.length === 0 ? (
              <Empty text="No outstanding balances 🎉" />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-heading font-semibold">Work Order</th>
                      <th className="px-3 py-2 font-heading font-semibold">Name</th>
                      <th className="px-3 py-2 text-right font-heading font-semibold">SD</th>
                      <th className="px-3 py-2 text-right font-heading font-semibold">HSE</th>
                      <th className="px-3 py-2 text-right font-heading font-semibold">PRS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.topOutstanding.map((o) => (
                      <tr key={o.work_order_no} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-700">{o.work_order_no}</td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-slate-500">
                          {o.wo_name || '—'}
                        </td>
                        <td className="tabular px-3 py-2 text-right text-slate-700">
                          {formatAmt(o.sd_balance)}
                        </td>
                        <td className="tabular px-3 py-2 text-right text-slate-700">
                          {formatAmt(o.hse_balance)}
                        </td>
                        <td className="tabular px-3 py-2 text-right text-slate-700">
                          {formatAmt(o.prs_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Recent activity */}
        <Panel title="Recent Work Orders" icon={Clock}>
          {m.recent.length === 0 ? (
            <Empty text="No work orders yet — create one or import your Excel data." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-heading font-semibold">Work Order</th>
                    <th className="px-3 py-2 font-heading font-semibold">Name</th>
                    <th className="px-3 py-2 font-heading font-semibold">Invoice</th>
                    <th className="px-3 py-2 font-heading font-semibold">Rec Date</th>
                    <th className="px-3 py-2 text-right font-heading font-semibold">Total</th>
                    <th className="px-3 py-2 text-center font-heading font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recent.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-brand-50/40">
                      <td className="px-3 py-2 font-semibold text-slate-700">{r.work_order_no}</td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-slate-500">
                        {r.wo_name || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.invoice_no}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(r.rec_date) || '—'}</td>
                      <td className="tabular px-3 py-2 text-right font-semibold text-slate-700">
                        {formatAmt(r.total_amt)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={r.wo_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
      <div className="tabular font-heading text-2xl font-bold text-slate-800">
        {label === 'Work Orders' ? value : `₹ ${value}`}
      </div>
      <div className="mt-0.5 text-[12px] text-slate-400">{sub}</div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
  className
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={`card p-5 ${className ?? ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="font-heading text-[15px] font-semibold text-slate-800">{title}</h3>
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
            <div className="text-[12px] font-semibold text-slate-600">{formatCompactINR(d.value)}</div>
            <div
              className="w-full max-w-[64px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
              style={{ height: `${h}%` }}
              title={`₹ ${formatAmt(d.value)}`}
            />
            <div className="text-[12px] font-medium text-slate-500">{d.label}</div>
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
    { value: created, color: '#f59e0b', label: 'Created' },
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
                strokeLinecap="butt"
              />
            )
            acc += dash
            return el
          })}
      </svg>
      <div className="space-y-2">
        <div className="text-center">
          <div className="tabular font-heading text-3xl font-bold text-slate-800">{total}</div>
          <div className="text-[12px] text-slate-400">total</div>
        </div>
      </div>
      <div className="space-y-2">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="tabular ml-auto font-semibold text-slate-800">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200'
}
const TONE_ICON: Record<string, string> = {
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  brand: 'bg-brand-600',
  slate: 'bg-slate-500'
}

function Reminder({
  tone,
  icon: Icon,
  title,
  sub,
  onClick
}: {
  tone: keyof typeof TONES
  icon: React.ComponentType<{ className?: string }>
  title: string
  sub: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-card ${TONES[tone]}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${TONE_ICON[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-heading text-[14px] font-semibold">{title}</div>
        <div className="truncate text-[12.5px] opacity-80">{sub}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </button>
  )
}

function Empty({ text }: { text: string }): React.JSX.Element {
  return <div className="py-8 text-center text-sm text-slate-400">{text}</div>
}
