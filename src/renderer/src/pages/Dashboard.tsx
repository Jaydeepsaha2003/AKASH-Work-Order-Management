import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Landmark,
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
import type { WorkOrder, Deduction, Page, Company } from '../lib/types'
import { formatAmt, formatCompactINR, formatDate, todayISO } from '../lib/format'
import { DateInput, Segmented, Select } from '../components/ui'

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

// "2022-23" → { from: 2022-04-01, to: 2023-03-31 }
function fyToRange(fy: string): { from: string; to: string } | null {
  const m = fy.match(/^(\d{4})-\d{2}$/)
  if (!m) return null
  const sy = parseInt(m[1], 10)
  return { from: `${sy}-04-01`, to: `${sy + 1}-03-31` }
}

export default function Dashboard({
  username,
  company,
  onNavigate
}: {
  username: string
  company: Company | null
  onNavigate: (p: Page) => void
}): React.JSX.Element {
  const [rows, setRows] = useState<WorkOrder[]>([])
  const [deds, setDeds] = useState<Deduction[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preset, setPreset] = useState<Preset>('all')
  const [fyValue, setFyValue] = useState('')

  function applyPreset(p: Preset): void {
    setPreset(p)
    setFyValue('')
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

  function pickFY(fy: string): void {
    setFyValue(fy)
    const r = fyToRange(fy)
    if (r) {
      setFrom(r.from)
      setTo(r.to)
      setPreset('custom')
    }
  }

  function setCustomFrom(v: string): void {
    setFrom(v)
    setPreset('custom')
    setFyValue('')
  }
  function setCustomTo(v: string): void {
    setTo(v)
    setPreset('custom')
    setFyValue('')
  }

  async function reload(): Promise<void> {
    const [wo, d] = await Promise.all([window.api.wo.list(), window.api.ded.list()])
    setRows(wo)
    setDeds(d)
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
    const landed = inRange.reduce((s, r) => s + r.total_amt, 0) // incl GST
    const net = inRange.reduce((s, r) => s + r.net_amount, 0) // received after deductions
    // total of every deduction column (what was withheld from the invoices)
    const deductions = inRange.reduce(
      (s, r) =>
        s +
        r.income_tax +
        r.gst_2 +
        r.cem_bags +
        r.labour_cess +
        r.penalty +
        r.land_rent +
        r.gst_rent_penalty +
        r.round_off +
        r.hse +
        r.price_deduction +
        r.sd_amt,
      0
    )
    const cancelled = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'cancelled')
    const received = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'received')
    const created = inRange.filter((r) => (r.wo_status || '').toLowerCase() === 'created')

    // SD / HSE / PRS pending — scoped to the date range by each deduction's date
    const dedInRange =
      !from && !to
        ? deds
        : deds.filter((d) => {
            const dt = d.deduct_date || ''
            if (from && dt < from) return false
            if (to && dt > to) return false
            return true
          })
    const sd = dedInRange.reduce((s, d) => s + (d.sd_debit - d.sd_credit), 0)
    const hse = dedInRange.reduce((s, d) => s + (d.hse_debit - d.hse_credit), 0)
    const prs = dedInRange.reduce((s, d) => s + (d.prs_debit - d.prs_credit), 0)

    // Turnover by financial year (within the selected date range)
    const byFy = new Map<string, number>()
    for (const r of inRange) byFy.set(r.fin_year, (byFy.get(r.fin_year) || 0) + r.gross_value)
    const fyData = [...byFy.entries()]
      .filter(([k]) => k)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }))

    // Pending invoices (status Created) with days pending, most overdue first
    const pending = inRange
      .filter((r) => (r.wo_status || '').toLowerCase() === 'created')
      .map((r) => ({ r, days: daysSince(r.invoice_date) ?? 0 }))
      .sort((a, b) => b.days - a.days)

    const pendingValue = pending.reduce((s, p) => s + p.r.total_amt, 0)

    return {
      turnover,
      gst,
      landed,
      net,
      deductions,
      cancelled,
      received,
      created,
      sd,
      hse,
      prs,
      fyData,
      pending,
      pendingValue
    }
  }, [inRange, deds, from, to])

  // all distinct financial years available in the data (newest first) for the quick filter
  const availableFYs = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.fin_year) set.add(r.fin_year)
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])

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
                {greeting}, {company?.name || 'there'}! 👋
              </h1>
              <p className="mt-1.5 text-[15px] text-white/70">Showing data for: {rangeLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              {company?.logo && (
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-sm">
                  <img src={company.logo} alt="" className="h-full w-full object-contain p-1" />
                </span>
              )}
              <button
                onClick={reload}
                className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-[15px] font-semibold backdrop-blur transition hover:bg-white/25"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-white/70 bg-gradient-to-br from-white to-[#eeecf8] p-4 shadow-card">
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
            <div className="w-40">
              <DateInput iso={from} onISO={setCustomFrom} />
            </div>
            <span className="text-slate-300">→</span>
            <div className="w-40">
              <DateInput iso={to} onISO={setCustomTo} />
            </div>
          </div>

          {/* Quick FY filter */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-500">Quick FY</span>
            <div className="w-44">
              <Select
                value={fyValue}
                onChange={pickFY}
                options={availableFYs.map((f) => ({ value: f, label: `FY ${f}` }))}
                placeholder="Select FY"
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Kpi
            icon={TrendingUp}
            label="Turnover (excl GST)"
            value={`₹ ${formatCompactINR(m.turnover)}`}
            sub={`${inRange.length} invoices in range`}
            tint="from-brand-600 to-brand-500"
          />
          <Kpi
            icon={Landmark}
            label="Landed Amount (incl GST)"
            value={`₹ ${formatCompactINR(m.landed)}`}
            sub={`GST ₹ ${formatCompactINR(m.gst)}`}
            tint="from-indigo-600 to-blue-500"
          />
          <Kpi
            icon={Wallet}
            label="Net Received"
            value={`₹ ${formatCompactINR(m.net)}`}
            sub={`Deductions ₹ ${formatCompactINR(m.deductions)}`}
            tint="from-emerald-600 to-teal-500"
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
            label="Total Invoices made"
            value={String(inRange.length)}
            sub={`${m.received.length} received · ${m.created.length} pending`}
            tint="from-fuchsia-600 to-pink-500"
          />
        </div>

        {/* SD / HSE / PRS pending till date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PendingCard label="SD Pending" value={m.sd} color="from-rose-500 to-red-500" icon={ShieldAlert} />
          <PendingCard label="HSE Pending" value={m.hse} color="from-brand-600 to-brand-500" icon={ShieldAlert} />
          <PendingCard label="PRS Pending" value={m.prs} color="from-teal-600 to-cyan-600" icon={CircleDollarSign} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Turnover by Financial Year" icon={TrendingUp} className="lg:col-span-2">
            <BarChart data={m.fyData} />
          </Panel>
          <Panel title="Invoice Status (in range)" icon={CircleDollarSign}>
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
              <div className="mb-3 flex flex-wrap items-center gap-4 text-[15px] text-slate-500">
                <span>
                  <b className="tabular text-[17px] text-slate-800">{m.pending.length}</b> pending
                </span>
                <span>
                  Worth{' '}
                  <b className="tabular text-[17px] text-slate-800">₹ {formatAmt(m.pendingValue)}</b>
                </span>
              </div>
              <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-[16.5px]" style={{ minWidth: 720 }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="app-gradient text-left text-[13.5px] uppercase tracking-wide text-white">
                      <th className="border-l border-white/15 px-4 py-2.5 font-heading font-semibold first:border-l-0">
                        Work Order
                      </th>
                      <th className="border-l border-white/15 px-4 py-2.5 font-heading font-semibold">
                        Name
                      </th>
                      <th className="border-l border-white/15 px-4 py-2.5 font-heading font-semibold">
                        Invoice
                      </th>
                      <th className="border-l border-white/15 px-4 py-2.5 font-heading font-semibold">
                        Invoice Date
                      </th>
                      <th className="border-l border-white/15 px-4 py-2.5 text-right font-heading font-semibold">
                        Total
                      </th>
                      <th className="border-l border-white/15 px-4 py-2.5 text-right font-heading font-semibold">
                        Days Pending
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.pending.map(({ r, days }, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-slate-200 transition hover:bg-brand-50 ${
                          i % 2 ? 'bg-brand-50' : 'bg-white'
                        }`}
                      >
                        <td className="tabular border-l border-slate-200 px-4 py-1.5 font-semibold text-slate-700 first:border-l-0">
                          {r.work_order_no}
                        </td>
                        <td className="max-w-[240px] truncate border-l border-slate-200 px-4 py-1.5 font-semibold text-slate-700">
                          {r.wo_name || '—'}
                        </td>
                        <td className="tabular border-l border-slate-200 px-4 py-1.5 font-semibold text-slate-700">
                          {r.invoice_no}
                        </td>
                        <td className="tabular border-l border-slate-200 px-4 py-1.5 font-semibold text-slate-700">
                          {formatDate(r.invoice_date) || '—'}
                        </td>
                        <td className="tabular border-l border-slate-200 px-4 py-1.5 text-right font-semibold text-slate-800">
                          {formatAmt(r.total_amt)}
                        </td>
                        <td className="border-l border-slate-200 px-4 py-1.5 text-right">
                          <span
                            className={`tabular inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
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
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white to-[#eeecf8] p-4 shadow-card">
      <div className={`absolute right-0 top-0 h-24 w-24 bg-gradient-to-br ${tint} opacity-20 blur-2xl`} />
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
    <div className={`rounded-2xl border border-white/70 bg-gradient-to-br from-white to-[#eeecf8] p-4 shadow-card ${className ?? ''}`}>
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
            <div className="tabular text-[15px] font-bold text-slate-700">
              {formatCompactINR(d.value)}
            </div>
            <div
              className="w-full max-w-[64px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
              style={{ height: `${h}%` }}
              title={`₹ ${formatAmt(d.value)}`}
            />
            <div className="tabular text-[15px] font-semibold text-slate-500">{d.label}</div>
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
