import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw,
  Loader2,
  DatabaseBackup,
  DatabaseZap,
  FileSpreadsheet,
  KeyRound,
  CheckCircle2,
  Info,
  ChevronRight
} from 'lucide-react'
import type { Page } from '../lib/types'
import { errText } from '../lib/format'

interface UpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error'
  version?: string
  percent?: number
  message?: string
}

export default function Settings({
  onNavigate
}: {
  onNavigate: (p: Page) => void
}): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [checking, setChecking] = useState(false)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null)

  useEffect(() => {
    window.api.app.version().then(setVersion)
    const off = window.api.update.onStatus((d) => {
      const s = d as UpdateStatus
      setUpdate(s)
      if (s.state !== 'checking' && s.state !== 'downloading') setChecking(false)
    })
    return off
  }, [])

  async function checkUpdates(): Promise<void> {
    setChecking(true)
    setUpdate({ state: 'checking' })
    try {
      const res = await window.api.update.check()
      if (!res.ok) {
        setChecking(false)
        setUpdate({ state: 'error', message: res.message })
        if (res.message === 'dev') toast.message('Update checks only run in the installed app.')
        else toast.error("Couldn't check for updates right now.")
        return
      }
      // Definitive answer from the main process (independent of background events)
      if (res.available) {
        setUpdate({ state: 'available', version: res.version })
        toast.success(`Update ${res.version} found — downloading…`)
        // background 'downloading' / 'ready' events take over from here
      } else {
        setChecking(false)
        setUpdate({ state: 'none' })
        toast.success("You're on the latest version ✓")
      }
    } catch (e) {
      setChecking(false)
      setUpdate({ state: 'error', message: errText(e) })
      toast.error("Couldn't check for updates right now.")
    }
  }

  const updateLine = ((): { text: string; tone: string } => {
    if (!update) return { text: 'Click to check for the latest version.', tone: 'text-slate-500' }
    switch (update.state) {
      case 'checking':
        return { text: 'Checking for updates…', tone: 'text-slate-500' }
      case 'none':
        return { text: "You're on the latest version ✓", tone: 'text-emerald-600' }
      case 'available':
        return { text: `Update ${update.version} found — downloading…`, tone: 'text-brand-600' }
      case 'downloading':
        return { text: `Downloading update… ${update.percent ?? 0}%`, tone: 'text-brand-600' }
      case 'ready':
        return {
          text: `Update ${update.version} ready — use the "Restart & Update" pill.`,
          tone: 'text-emerald-600'
        }
      case 'error':
        return {
          text: update.message?.includes('dev')
            ? 'Update checks only run in the installed app.'
            : `Couldn't check right now: ${update.message ?? 'unknown error'}`,
          tone: 'text-amber-600'
        }
      default:
        return { text: '', tone: 'text-slate-500' }
    }
  })()

  async function backup(): Promise<void> {
    setBusy('backup')
    try {
      const res = await window.api.db.backup()
      if (res.ok) toast.success(res.message)
      else toast.message(res.message)
    } catch (e) {
      toast.error(errText(e))
    } finally {
      setBusy(null)
    }
  }

  async function restore(): Promise<void> {
    if (
      !confirm(
        'Restore database?\n\nThis REPLACES all current data with the chosen backup file and restarts the app. Make a backup first if unsure. Continue?'
      )
    )
      return
    setBusy('restore')
    try {
      const res = await window.api.db.restore()
      if (res.ok) toast.success(res.message)
      else toast.message(res.message)
    } catch (e) {
      toast.error(errText(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="mx-auto max-w-3xl space-y-4 pb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-[16px] text-slate-500">Updates, data backup, and account.</p>
        </div>

        {/* Application & updates */}
        <Section
          icon={RefreshCw}
          title="Application & Updates"
          tint="from-brand-600 to-brand-500"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[14px] text-slate-500">Current version</div>
              <div className="font-heading text-xl font-bold text-slate-800">v{version || '—'}</div>
              <div className={`mt-1 text-[14.5px] ${updateLine.tone}`}>{updateLine.text}</div>
            </div>
            <button className="btn-primary" onClick={checkUpdates} disabled={checking}>
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check for updates
            </button>
          </div>
          <Note>
            The app also checks automatically on launch and every 6 hours. When an update is ready
            you&apos;ll see a <b>Restart &amp; Update</b> pill — one click installs it and your data
            stays intact.
          </Note>
        </Section>

        {/* Backup & restore */}
        <Section icon={DatabaseBackup} title="Database Backup & Restore" tint="from-teal-600 to-cyan-600">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="flex items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-teal-400 disabled:opacity-60"
              onClick={backup}
              disabled={busy !== null}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                {busy === 'backup' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <DatabaseBackup className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-heading text-[16px] font-semibold text-slate-800">
                  Backup database
                </div>
                <p className="mt-0.5 text-[14px] text-slate-500">
                  Save all your data to a single <b>.sqlite</b> file you can store or copy to another
                  PC.
                </p>
              </div>
            </button>

            <button
              className="flex items-start gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-rose-400 disabled:opacity-60"
              onClick={restore}
              disabled={busy !== null}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                {busy === 'restore' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <DatabaseZap className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-heading text-[16px] font-semibold text-slate-800">
                  Restore from backup
                </div>
                <p className="mt-0.5 text-[14px] text-slate-500">
                  Load a <b>.sqlite</b> backup — <span className="text-rose-600">replaces</span>{' '}
                  current data and restarts the app.
                </p>
              </div>
            </button>
          </div>
          <Note>
            <b>Moving to a new computer?</b> Take a backup here, copy the <b>.sqlite</b> file over,
            install the app there, then use <b>Restore</b> to load all your work orders and
            deductions.
          </Note>
        </Section>

        {/* Import from Excel */}
        <Section icon={FileSpreadsheet} title="Import from Excel" tint="from-emerald-600 to-teal-500">
          <LinkRow
            title="Import work orders & deductions from .xlsm / .xlsx"
            sub="Load your existing Excel workbook (Data + Deduction sheets)."
            onClick={() => onNavigate('import')}
          />
        </Section>

        {/* Account */}
        <Section icon={KeyRound} title="Account & Security" tint="from-violet-600 to-purple-500">
          <LinkRow
            title="Change password"
            sub="Update your login password."
            onClick={() => onNavigate('password')}
          />
        </Section>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  tint,
  children
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tint: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="font-heading text-[17px] font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[14px] leading-relaxed text-slate-500">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span>{children}</span>
    </div>
  )
}

function LinkRow({
  title,
  sub,
  onClick
}: {
  title: string
  sub: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
    >
      <CheckCircle2 className="h-5 w-5 text-brand-500" />
      <div className="min-w-0 flex-1">
        <div className="font-heading text-[15.5px] font-semibold text-slate-800">{title}</div>
        <div className="truncate text-[14px] text-slate-500">{sub}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </button>
  )
}
