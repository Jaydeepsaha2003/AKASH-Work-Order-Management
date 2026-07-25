import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, ArrowLeft } from 'lucide-react'
import { errText, fail } from '../lib/format'

export default function ChangePassword({
  username,
  onDone
}: {
  username: string
  onDone: () => void
}): React.JSX.Element {
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (newPassword !== confirm) return fail('New password and confirmation do not match.')
    setBusy(true)
    try {
      const res = await window.api.auth.changePassword(username, oldPassword, newPassword)
      if (res.ok) {
        toast.success(res.message)
        onDone()
      } else toast.error(res.message)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-start justify-center pt-6">
      <div className="card w-full max-w-md p-7">
        <button
          onClick={onDone}
          className="mb-4 flex items-center gap-1.5 text-[16px] font-semibold text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-800">Change Password</h2>
            <p className="text-[16px] text-slate-500">for {username}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-1.5">
            <label className="field-label">Current Password</label>
            <input
              className="input"
              type="password"
              value={oldPassword}
              onChange={(e) => setOld(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="field-label">New Password</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="field-label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
