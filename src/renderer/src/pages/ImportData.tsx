import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { errText } from '../lib/format'

type Mode = 'replace' | 'append'

export default function ImportData({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('replace')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    woInserted?: number
    woSkipped?: number
    dedInserted?: number
    message: string
  } | null>(null)

  async function run(): Promise<void> {
    if (
      mode === 'replace' &&
      !confirm(
        'Replace all data?\n\nThis permanently deletes every existing work order and deduction in the app, then loads the ones from the Excel file. Continue?'
      )
    )
      return
    setBusy(true)
    setResult(null)
    try {
      const res = await window.api.excel.import(mode)
      if (res.ok) {
        toast.success('Import complete')
        setResult(res)
      } else {
        toast.message(res.message)
      }
    } catch (e) {
      toast.error(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-start justify-center overflow-auto pt-4">
      <div className="w-full max-w-2xl">
        <button
          onClick={onDone}
          className="mb-4 flex items-center gap-1.5 text-[16px] font-semibold text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="card p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-800">Import Excel Data</h2>
              <p className="text-[16px] text-slate-500">
                Load work orders &amp; deductions from your existing <b>.xlsm</b> / <b>.xlsx</b> file
              </p>
            </div>
          </div>

          <p className="mb-5 text-[14.5px] leading-relaxed text-slate-600">
            The importer reads the <b>Data</b> sheet (work orders &amp; invoices) and the{' '}
            <b>Deduction</b> sheet (ledger entries) from the workbook, matching the original column
            layout. Everything else in the file is ignored.
          </p>

          {/* import mode */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === 'replace'}
              onClick={() => setMode('replace')}
              title="Replace all"
              recommended
              desc="Clear the app's current data first, then import. Best for a clean one-time load."
            />
            <ModeCard
              active={mode === 'append'}
              onClick={() => setMode('append')}
              title="Append"
              desc="Add these rows on top of existing data. Duplicate work orders are skipped automatically."
            />
          </div>

          {mode === 'replace' && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[14px] text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <b>Replace all</b> permanently deletes every existing work order and deduction in the
                app before importing. You&apos;ll be asked to confirm.
              </span>
            </div>
          )}

          <button className="btn-primary mt-6 w-full" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? 'Importing…' : 'Choose file & import'}
          </button>

          {result && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-3 flex items-center gap-2 font-heading font-semibold text-emerald-800">
                <CheckCircle2 className="h-5 w-5" /> Import successful
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Work Orders" value={result.woInserted ?? 0} />
                <Stat label="Skipped" value={result.woSkipped ?? 0} />
                <Stat label="Deductions" value={result.dedInserted ?? 0} />
              </div>
              <button className="btn-green mt-5 w-full" onClick={onDone}>
                Go to Work Orders
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
  recommended
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
  recommended?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition ${
        active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-heading text-[16px] font-bold text-slate-800">{title}</span>
        {recommended && (
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11.5px] font-semibold text-white">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-1 text-[14px] leading-snug text-slate-500">{desc}</p>
    </button>
  )
}

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white px-3 py-2.5">
      <div className="tabular font-heading text-2xl font-bold text-brand-700">{value}</div>
      <div className="text-[13px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}
