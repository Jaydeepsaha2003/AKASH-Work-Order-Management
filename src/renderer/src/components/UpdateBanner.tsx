import { useEffect, useState } from 'react'
import { Download, RefreshCw, Sparkles, X } from 'lucide-react'

interface UpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error'
  version?: string
  percent?: number
  message?: string
}

export default function UpdateBanner(): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.api?.update) return
    const off = window.api.update.onStatus((data) => {
      setStatus(data as UpdateStatus)
      setDismissed(false)
    })
    return off
  }, [])

  if (!status || dismissed) return null
  const { state } = status

  // Only surface meaningful states
  if (state !== 'available' && state !== 'downloading' && state !== 'ready') return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 animate-fade-in">
      <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-glow">
        <div className="app-gradient flex items-center justify-between px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 font-heading text-[16px] font-semibold">
            <Sparkles className="h-4 w-4" />
            {state === 'ready' ? 'Update ready' : 'App update'}
          </div>
          <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {state === 'available' && (
            <p className="flex items-center gap-2 text-[14.5px] text-slate-600">
              <Download className="h-4 w-4 text-brand-600" />
              Downloading version {status.version}…
            </p>
          )}

          {state === 'downloading' && (
            <div>
              <p className="mb-2 text-[14.5px] text-slate-600">
                Downloading update… <b>{status.percent ?? 0}%</b>
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                  style={{ width: `${status.percent ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {state === 'ready' && (
            <div>
              <p className="text-[14.5px] leading-relaxed text-slate-600">
                Version <b className="text-slate-800">{status.version}</b> has been downloaded.
                Restart to apply it — your data stays safe.
              </p>
              <button
                onClick={() => window.api.update.install()}
                className="btn-primary mt-3 w-full"
              >
                <RefreshCw className="h-4 w-4" /> Restart &amp; Update
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="mt-2 w-full text-center text-[13.5px] text-slate-400 hover:text-slate-600"
              >
                Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
