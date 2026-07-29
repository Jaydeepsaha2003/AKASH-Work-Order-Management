import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Check,
  CalendarDays,
  X,
  Paperclip,
  FileText
} from 'lucide-react'
import { formatDate, toISODate, formatAmt } from '../lib/format'

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export interface FileRef {
  filename: string
  originalName: string
}

// Attach / view / remove PDF files. The parent owns the list and persists it
// (via window.api.attach.sync) when its record is saved.
export function AttachmentBar({
  files,
  onChange,
  label = 'Attachments (PDF)'
}: {
  files: FileRef[]
  onChange: (next: FileRef[]) => void
  label?: string
}): React.JSX.Element {
  async function add(): Promise<void> {
    const res = await window.api.attach.upload()
    if (res.ok && res.files?.length) {
      const seen = new Set(files.map((f) => f.filename))
      onChange([...files, ...res.files.filter((f) => !seen.has(f.filename))])
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="field-label">{label}</span>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[13px] font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50"
        >
          <Paperclip className="h-3.5 w-3.5" /> Attach PDF
        </button>
      </div>
      {files.length === 0 ? (
        <div className="text-[13px] text-slate-400">No files attached.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={f.filename}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[13px]"
            >
              <button
                type="button"
                title="Open PDF"
                onClick={() => window.api.attach.open(f.filename)}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-brand-700"
              >
                <FileText className="h-3.5 w-3.5 text-rose-500" />
                <span className="max-w-[180px] truncate">{f.originalName}</span>
              </button>
              <button
                type="button"
                title="Remove"
                onClick={() => onChange(files.filter((x) => x.filename !== f.filename))}
                className="text-slate-400 transition hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Centered modal dialog. Click the backdrop or press Escape to close.
export function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-4xl'
}: {
  open: boolean
  onClose: () => void
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          'my-8 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-glow',
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h3 className="font-heading text-[17px] font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
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
            tabIndex={-1}
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
        className="input flex items-center justify-between gap-1 pr-9 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn('truncate', !current && 'text-slate-400')}>
          {current ? current.label : placeholder}
        </span>
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
  // Use a lighter (550) weight instead of the default semibold (600)
  light?: boolean
  // Allow the cell text to wrap onto multiple lines (constrained to the column width)
  wrap?: boolean
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
  actionsHeader = 'Actions',
  defaultSortKey,
  defaultSortDir = 'asc',
  defaultSort,
  showTotals = false,
  totalsLabel = 'TOTAL',
  uniformText = false
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
  // initial single-column sort (e.g. 'invoice_no'); users can still click to re-sort
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  // multi-level default sort applied until the user clicks a header
  // e.g. [{ key: 'fin_year', dir: 'desc' }, { key: 'invoice_no', dir: 'asc' }]
  defaultSort?: { key: string; dir: 'asc' | 'desc' }[]
  // render a pinned bottom row with column-wise sums of all numeric columns
  showTotals?: boolean
  totalsLabel?: string
  // headers use the body font size, wrap, and every cell is bold (ignores `light`)
  uniformText?: boolean
}): React.JSX.Element {
  const rowBg = (i: number): string =>
    selectedIndex === i ? 'bg-brand-100' : i % 2 ? 'bg-brand-50' : 'bg-white'

  // User-driven single-column sort (null until a header is clicked)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: string): void => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Effective default sort: explicit multi-level, else the single defaultSortKey, else none
  const defaultLevels = useMemo(
    () =>
      defaultSort ?? (defaultSortKey ? [{ key: defaultSortKey, dir: defaultSortDir }] : []),
    [defaultSort, defaultSortKey, defaultSortDir]
  )

  const sorted = useMemo(() => {
    const cmpBy = (a: T, b: T, key: string, dir: 'asc' | 'desc'): number => {
      const col = columns.find((c) => c.key === key)
      const av = (a as Record<string, unknown>)[key]
      const bv = (b as Record<string, unknown>)[key]
      let cmp: number
      if (col?.numeric) {
        cmp = (parseFloat(String(av)) || 0) - (parseFloat(String(bv)) || 0)
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      }
      return dir === 'asc' ? cmp : -cmp
    }

    // A user click overrides the default with a single-column sort.
    if (sortKey) {
      return [...rows].sort((a, b) => cmpBy(a, b, sortKey, sortDir))
    }
    // Otherwise apply the multi-level default sort (if any).
    if (defaultLevels.length) {
      return [...rows].sort((a, b) => {
        for (const lvl of defaultLevels) {
          const c = cmpBy(a, b, lvl.key, lvl.dir)
          if (c !== 0) return c
        }
        return 0
      })
    }
    return rows
  }, [rows, sortKey, sortDir, columns, defaultLevels])

  // Column-wise sums for the totals row (numeric columns only)
  const totals = useMemo(() => {
    if (!showTotals) return {}
    const acc: Record<string, number> = {}
    for (const c of columns) {
      if (!c.numeric) continue
      acc[c.key] = rows.reduce(
        (s, r) => s + (Number((r as Record<string, unknown>)[c.key]) || 0),
        0
      )
    }
    return acc
  }, [rows, columns, showTotals])

  return (
    <div className="h-full overflow-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-[16.5px]" style={{ minWidth }}>
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
                  className={cn(
                    'cursor-pointer select-none border-l border-white/15 px-3 py-2.5 font-heading font-semibold transition first:border-l-0 hover:bg-white/10',
                    uniformText ? 'whitespace-normal align-top text-[15px]' : 'whitespace-nowrap text-[13.5px]'
                  )}
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
              className={cn('group cursor-pointer border-b border-slate-200 transition', rowBg(i))}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'border-l border-slate-200 px-3 py-1.5 text-slate-700 transition-colors first:border-l-0 group-hover:bg-brand-50/60',
                    c.wrap ? 'whitespace-normal align-top leading-snug' : 'whitespace-nowrap',
                    c.light && !uniformText ? 'font-medium' : 'font-semibold',
                    (c.numeric || c.tabular) && 'tabular'
                  )}
                  style={{
                    textAlign: c.align ?? (c.numeric ? 'right' : 'left'),
                    ...(c.wrap && c.width ? { maxWidth: c.width } : {})
                  }}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
              {rowActions && (
                <td
                  className={cn(
                    'sticky right-0 z-10 whitespace-nowrap border-l border-slate-200 px-2 py-0.5 text-center',
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
        {showTotals && rows.length > 0 && (
          <tfoot className="sticky bottom-0 z-20">
            <tr className="app-gradient text-white">
              {columns.map((c, ci) => {
                const alignRight = (c.align ?? (c.numeric ? 'right' : 'left')) === 'right'
                return (
                  <td
                    key={c.key}
                    className={cn(
                      'whitespace-nowrap border-l border-white/15 px-3 py-2.5 font-heading text-[15px] font-bold first:border-l-0',
                      c.numeric && 'tabular'
                    )}
                    style={{ textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}
                  >
                    {c.numeric ? (
                      formatAmt(totals[c.key] ?? 0)
                    ) : ci === 0 ? (
                      <span className={cn('inline-flex items-center gap-1', alignRight && 'flex-row-reverse')}>
                        {totalsLabel}
                      </span>
                    ) : (
                      ''
                    )}
                  </td>
                )
              })}
              {rowActions && (
                <td className="sticky right-0 z-10 border-l border-white/15 bg-brand-700 px-2 shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.35)]" />
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
