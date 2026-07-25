import { useMemo, useState } from 'react'
import { Eye, EyeOff, LogIn, Loader2, User, Lock } from 'lucide-react'
import type { AuthUser } from '../lib/types'
import { errText } from '../lib/format'

export default function Login({ onLogin }: { onLogin: (u: AuthUser) => void }): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h >= 6 && h < 12) return 'Good Morning!'
    if (h >= 12 && h < 16) return 'Good Afternoon!'
    return 'Good Evening!'
  }, [])

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await window.api.auth.login(username.trim(), password.trim())
      if (user) onLogin(user)
      else setError('Invalid User ID or Password')
    } catch (err) {
      setError(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[var(--bg)]">
      {/* Left brand panel */}
      <div className="app-gradient relative hidden h-full w-1/2 flex-col justify-between p-14 lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -left-16 top-24 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 right-6 h-96 w-96 rounded-full bg-fuchsia-300/40 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold text-white backdrop-blur">
            A
          </div>
          <span className="font-heading text-2xl font-bold tracking-wide text-white">AKASH</span>
        </div>
        <div className="relative">
          <h2 className="font-heading text-5xl font-bold leading-[1.1] text-white">
            Work Order
            <br />
            Management
            <br />
            System
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">
            Track work orders, invoices, GST, deductions and outstanding balances — all in one
            fast, offline desktop app.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {['Work Orders', 'Invoices', 'Deductions', 'Outstanding'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[16px] font-medium text-white backdrop-blur"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative text-[18px] text-white/60">v1.0 • Local SQLite database</div>
      </div>

      {/* Right login form */}
      <div className="flex h-full w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <div className="font-heading text-[18px] font-semibold uppercase tracking-[0.2em] text-brand-500">
              {greeting}
            </div>
            <h1 className="mt-2 font-heading text-4xl font-bold text-slate-800">Welcome back</h1>
            <p className="mt-2 text-lg text-slate-500">Sign in to continue</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-2">
              <label className="text-[16px] font-semibold text-slate-700">User ID</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  className="input h-13 pl-11 text-[17px]"
                  value={username}
                  autoFocus
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter user ID"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[16px] font-semibold text-slate-700">Password</label>
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    className="input h-13 pl-11 text-[17px]"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  title={show ? 'Hide password' : 'Show password'}
                  className="flex h-13 w-13 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
                >
                  {show ? <EyeOff className="h-5.5 w-5.5" /> : <Eye className="h-5.5 w-5.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 px-4 py-3 text-[16px] font-medium text-rose-600">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary h-13 w-full text-[17px]" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-[16px] text-slate-400">
            Default users: <b className="text-slate-500">Prahlad</b> /{' '}
            <b className="text-slate-500">jaydeep</b> — change your password after signing in.
          </p>
        </div>
      </div>
    </div>
  )
}
