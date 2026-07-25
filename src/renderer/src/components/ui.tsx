import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { formatDate, toISODate } from '../lib/format'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Field({
  label,
  children,
  className
}: {
  label: string
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { readOnlyLook?: boolean }
): React.JSX.Element {
  const { className, readOnlyLook, ...rest } = props
  return <input className={cn('input', readOnlyLook && 'input-readonly', className)} {...rest} />
}

// Numeric input that keeps a raw string but only allows numbers / decimals
export function NumberInput({
  value,
  onValue,
  className,
  ...rest
}: {
  value: string
  onValue: (v: string) => void
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>): React.JSX.Element {
  return (
    <input
      className={cn('input tabular text-right', className)}
      value={value}
      inputMode="decimal"
      onChange={(e) => {
        const v = e.target.value
        if (v === '' || /^-?\d*\.?\d*$/.test(v)) onValue(v)
      }}
      {...rest}
    />
  )
}

// Date input: user types freely, on blur it normalises to dd-MMM-yy for display.
// Stores ISO via onISO.
export function DateInput({
  iso,
  onISO,
  readOnlyLook,
  placeholder = 'dd-MMM-yy'
}: {
  iso: string
  onISO: (isoDate: string) => void
  readOnlyLook?: boolean
  placeholder?: string
}): React.JSX.Element {
  const [text, setText] = useState(formatDate(iso))
  useEffect(() => {
    setText(formatDate(iso))
  }, [iso])
  return (
    <input
      className={cn('input', readOnlyLook && 'input-readonly')}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim()) {
          onISO('')
          setText('')
          return
        }
        const norm = toISODate(text)
        if (norm) {
          onISO(norm)
          setText(formatDate(norm))
        } else {
          setText(formatDate(iso))
        }
      }}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  className,
  placeholder
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
  placeholder?: string
}): React.JSX.Element {
  return (
    <div className={cn('relative', className)}>
      <select
        className="input appearance-none pr-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-5 w-5 text-slate-400" />
    </div>
  )
}

// Searchable combo box (used for Work Order No pickers)
export function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Select…'
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="input flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn(!value && 'text-slate-400')}>{value || placeholder}</span>
        <ChevronDown className="h-5 w-5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                className={cn(
                  'block w-full px-3 py-1.5 text-left text-sm hover:bg-brand-50',
                  o === value && 'bg-brand-100 font-semibold'
                )}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                  setQ('')
                }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export interface Column<T> {
  key: string
  header: string
  width?: number
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => React.ReactNode
  numeric?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  minWidth = 900,
  selectedIndex,
  onSelect,
  onRowDoubleClick,
  emptyText = 'No records'
}: {
  columns: Column<T>[]
  rows: T[]
  minWidth?: number
  selectedIndex?: number
  onSelect?: (i: number, row: T) => void
  onRowDoubleClick?: (i: number, row: T) => void
  emptyText?: string
}): React.JSX.Element {
  return (
    <div className="h-full overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <thead className="sticky top-0 z-10">
          <tr className="app-gradient text-left text-white">
            {columns.map((c) => (
              <th
                key={c.key}
                className="whitespace-nowrap px-3 py-2.5 font-heading text-[12.5px] font-semibold"
                style={{ width: c.width, textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-400">
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onSelect?.(i, row)}
              onDoubleClick={() => onRowDoubleClick?.(i, row)}
              className={cn(
                'cursor-pointer border-b border-slate-100 transition',
                selectedIndex === i ? 'bg-brand-100' : i % 2 ? 'bg-slate-50/60' : 'bg-white',
                'hover:bg-brand-50'
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 text-slate-700',
                    c.numeric && 'tabular'
                  )}
                  style={{ textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
