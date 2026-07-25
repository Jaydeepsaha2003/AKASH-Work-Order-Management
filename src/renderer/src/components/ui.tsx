import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, Check, CalendarDays } from 'lucide-react'
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
    <div className={cn('grid gap-1', className)}>
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

// Date field: always displays dd-mm-yyyy (Calibri), typeable, with a calendar
// icon you click to open the native date picker. Stores/reads ISO yyyy-mm-dd.
export function DateInput({
  iso,
  onISO,
  readOnlyLook,
  className
}: {
  iso: string
  onISO: (isoDate: string) => void
  readOnlyLook?: boolean
  className?: string
}): React.JSX.Element {
  const [text, setText] = useState(formatDate(iso))
  useEffect(() => {
    setText(formatDate(iso))
  }, [iso])

  const commit = (): void => {
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
  }

  return (
    <div className="relative">
      <input
        className={cn('input tabular pr-10', className, readOnlyLook && 'input-readonly')}
        value={text}
        placeholder="dd-mm-yyyy"
        readOnly={readOnlyLook}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
      />
      {!readOnlyLook && (
        // A transparent native date input sits over the calendar icon, so clicking it
        // reliably opens the system picker; the icon shows behind it.
        <span className="absolute right-1 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400">
          <CalendarDays className="pointer-events-none h-[18px] w-[18px]" />
          <input
            type="date"
            title="Open calendar"
            value={iso || ''}
            onChange={(e) => onISO(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      )}
    </div>
  )
}

// Segmented control (pill toggle group)
export function Segmented<T extends string>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}): React.JSX.Element {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-[14px] font-semibold transition',
            value === o.value
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Searchable dropdown (value/label). The search box auto-hides for short lists.
export function Select({
  value,
  onChange,
  options,
  className,
  placeholder = 'Select…',
  searchable
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
  placeholder?: string
  searchable?: boolean
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

  const showSearch = searchable ?? options.length > 6
  const current = options.find((o) => o.value === value)
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        className="input flex items-center justify-between pr-9 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn(!current && 'text-slate-400')}>{current ? current.label : placeholder}</span>
      </button>
      <ChevronDown
        className={cn(
          'pointer-events-none absolute right-2.5 top-2.5 h-5 w-5 text-slate-400 transition-transform',
          open && 'rotate-180'
        )}
      />
      {open && (
        <div className="dropdown-panel absolute z-40 mt-1.5 w-full">
          {showSearch && (
            <div className="dropdown-search">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                className="w-full bg-transparent text-[15px] outline-none"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          <div className="dropdown-list">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[15px] text-slate-400">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={cn('dropdown-item', o.value === value && 'dropdown-item-active')}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setQ('')
                }}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Editable combo box: type a NEW value or pick an existing one (used for Work Order No on Create WO)
export function EditableCombo({
  value,
  onChange,
  options,
  placeholder = 'Select or type…',
  disabled
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
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

  // filter by what's typed; if the exact value is already selected show the full list
  const safe = options.filter((o): o is string => typeof o === 'string' && o.length > 0)
  const q = value.trim().toLowerCase()
  const filtered =
    q && !safe.some((o) => o.toLowerCase() === q)
      ? safe.filter((o) => o.toLowerCase().includes(q))
      : safe

  return (
    <div className={cn('relative', disabled && 'pointer-events-none opacity-60')} ref={ref}>
      <input
        className="input tabular pr-10"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        className="absolute right-0 top-0 flex h-full items-center px-2.5 text-slate-400 hover:text-slate-600"
      >
        <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && filtered.length > 0 && (
        <div className="dropdown-panel absolute z-40 mt-1.5 w-full">
          <div className="dropdown-list">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                className={cn('dropdown-item', o === value && 'dropdown-item-active')}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
              >
                <span className="tabular min-w-0 flex-1 truncate">{o}</span>
                {o === value && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
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

  const filtered = options.filter(
    (o) => typeof o === 'string' && o.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="input flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn('tabular truncate', !value && 'text-slate-400')}>{value || placeholder}</span>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="dropdown-panel absolute z-30 mt-1.5 w-full">
          <div className="dropdown-search">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              autoFocus
              className="w-full bg-transparent text-[15px] outline-none"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="dropdown-list">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[15px] text-slate-400">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                className={cn('dropdown-item', o === value && 'dropdown-item-active')}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                  setQ('')
                }}
              >
                <span className="tabular min-w-0 flex-1 truncate">{o}</span>
                {o === value && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
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
  // Calibri (tabular) digits without forcing right-alignment — for dates, ids, etc.
  tabular?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  minWidth = 900,
  selectedIndex,
  onSelect,
  onRowDoubleClick,
  emptyText = 'No records',
  rowActions,
  actionsHeader = 'Actions'
}: {
  columns: Column<T>[]
  rows: T[]
  minWidth?: number
  selectedIndex?: number
  onSelect?: (i: number, row: T) => void
  onRowDoubleClick?: (i: number, row: T) => void
  emptyText?: string
  // when provided, a pinned (always-visible) right column of per-row actions is shown
  rowActions?: (row: T, i: number) => React.ReactNode
  actionsHeader?: string
}): React.JSX.Element {
  const rowBg = (i: number): string =>
    selectedIndex === i ? 'bg-brand-100' : i % 2 ? 'bg-slate-50' : 'bg-white'

  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: string): void => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    const numeric = !!col?.numeric
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      let cmp: number
      if (numeric) {
        cmp = (parseFloat(String(av)) || 0) - (parseFloat(String(bv)) || 0)
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir, columns])

  return (
    <div className="h-full overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-[15px]" style={{ minWidth }}>
        <thead className="sticky top-0 z-20">
          <tr className="app-gradient text-left text-white">
            {columns.map((c) => {
              const active = sortKey === c.key
              const alignRight = (c.align ?? (c.numeric ? 'right' : 'left')) === 'right'
              return (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  title="Click to sort"
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-heading text-[13.5px] font-semibold transition hover:bg-white/10"
                  style={{ width: c.width, textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      alignRight && 'flex-row-reverse'
                    )}
                  >
                    {c.header}
                    {active ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </span>
                </th>
              )
            })}
            {rowActions && (
              <th className="sticky right-0 z-30 whitespace-nowrap bg-brand-700 px-3 py-2.5 text-center font-heading text-[13.5px] font-semibold shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.35)]">
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (rowActions ? 1 : 0)}
                className="px-3 py-10 text-center text-slate-400"
              >
                {emptyText}
              </td>
            </tr>
          )}
          {sorted.map((row, i) => (
            <tr
              key={i}
              onClick={() => onSelect?.(i, row)}
              onDoubleClick={() => onRowDoubleClick?.(i, row)}
              className={cn('group cursor-pointer border-b border-slate-100 transition', rowBg(i))}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-1 text-slate-700 transition-colors group-hover:bg-brand-50/60',
                    (c.numeric || c.tabular) && 'tabular'
                  )}
                  style={{ textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
              {rowActions && (
                <td
                  className={cn(
                    'sticky right-0 z-10 whitespace-nowrap px-2 py-0.5 text-center',
                    rowBg(i),
                    'group-hover:bg-brand-50',
                    'shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.18)]'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {rowActions(row, i)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
