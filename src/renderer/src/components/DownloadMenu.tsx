import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { exportExcel, exportPDF, type DownloadPayload } from '../lib/download'
import { cn } from './ui'

export default function DownloadMenu({
  build,
  label = 'Download',
  variant = 'teal'
}: {
  build: () => DownloadPayload | null
  label?: string
  variant?: 'teal' | 'ghost'
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const run = (fn: (p: DownloadPayload) => void): void => {
    const p = build()
    setOpen(false)
    if (p) fn(p)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className={cn(variant === 'teal' ? 'btn-teal' : 'btn-ghost')}
        onClick={() => setOpen((v) => !v)}
      >
        <Download className="h-4 w-4" /> {label}
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div className="dropdown-panel absolute right-0 z-30 mt-1.5 w-56">
          <div className="px-4 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Download as
          </div>
          <button
            className="dropdown-item font-semibold hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => run(exportExcel)}
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> Excel (.xlsx)
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item font-semibold hover:bg-rose-50 hover:text-rose-700"
            onClick={() => run(exportPDF)}
          >
            <FileText className="h-4.5 w-4.5 text-rose-600" /> PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  )
}
