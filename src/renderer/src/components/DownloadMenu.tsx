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
        <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-slate-700 hover:bg-emerald-50"
            onClick={() => run(exportExcel)}
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> Excel (.xlsx)
          </button>
          <div className="h-px bg-slate-100" />
          <button
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-slate-700 hover:bg-rose-50"
            onClick={() => run(exportPDF)}
          >
            <FileText className="h-4.5 w-4.5 text-rose-600" /> PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  )
}
