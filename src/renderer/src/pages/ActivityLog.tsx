import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Trash2, Filter } from 'lucide-react'
import type { ActivityRow } from '../lib/types'
import { errText } from '../lib/format'

const ACTION_STYLE: Record<string, string> = {
  Created: 'bg-emerald-100 text-emerald-700',
  Received: 'bg-emerald-100 text-emerald-700',
  Updated: 'bg-amber-100 text-amber-700',
  Changed: 'bg-amber-100 text-amber-700',
  Switched: 'bg-sky-100 text-sky-700',
  Imported: 'bg-brand-100 text-brand-700',
  Restored: 'bg-brand-100 text-brand-700',
  Deleted: 'bg-rose-100 text-rose-700'
}

function fmtTs(ts: string): string {
  // stored as UTC "YYYY-MM-DD HH:MM:SS"
  const d = new Date(ts.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ts
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ActivityLog(): React.JSX.Element {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [q, setQ] = useState('')

  async function reload(): Promise<void> {
    setRows(await window.api.activity.list())
  }
  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim()
    if (!t) return rows
    return rows.filter((r) =>
      [r.username, r.company_name, r.action, r.entity, r.summary]
        .join(' ')
        .toLowerCase()
        .includes(t)
    )
  }, [rows, q])

  async function clearAll(): Promise<void> {
    if (!confirm('Clear the entire activity log? This cannot be undone.')) return
    try {
      const res = await window.api.activity.clear()
      if (res.ok) {
        toast.success(res.message)
        reload()
      }
    } catch (e) {
      toast.error(errText(e))
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input w-72 pl-9"
            placeholder="Search activity…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-ghost" onClick={reload}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[15px] text-slate-500">{filtered.length} entries</span>
          <button className="btn-red" onClick={clearAll}>
            <Trash2 className="h-4 w-4" /> Clear log
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-[14px]" style={{ minWidth: 820 }}>
          <thead className="sticky top-0 z-10">
            <tr className="app-gradient text-left text-white">
              <th className="whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold">
                When
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold">
                User
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold">
                Company
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold">
                Action
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold">
                Type
              </th>
              <th className="px-3 py-2.5 font-heading text-[13.5px] font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                  No activity yet
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                className={i % 2 ? 'bg-slate-50/60' : 'bg-white'}
              >
                <td className="tabular whitespace-nowrap px-3 py-2 text-slate-600">{fmtTs(r.ts)}</td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700">
                  {r.username || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.company_name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12.5px] font-semibold ${
                      ACTION_STYLE[r.action || ''] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {r.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.entity}</td>
                <td className="px-3 py-2 text-slate-600">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
