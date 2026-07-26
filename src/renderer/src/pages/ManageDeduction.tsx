import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save, Eraser, RefreshCw, Trash2, Pencil, Scale, Search } from 'lucide-react'
import type { Deduction, WoListItem } from '../lib/types'
import { Field, TextInput, NumberInput, DateInput, ComboBox, Select, DataTable, type Column } from '../components/ui'
import { formatAmt, formatDate, financialYear, toNum, todayISO, errText, fail } from '../lib/format'
import DownloadMenu from '../components/DownloadMenu'
import type { DownloadPayload } from '../lib/download'

const blank = {
  work_order_no: '',
  invoice_no: '',
  deduct_date: todayISO(),
  rec_date: '',
  description: '',
  create_status: 'Manual',
  wo_name: '',
  sd_debit: '',
  sd_credit: '',
  prs_debit: '',
  prs_credit: '',
  hse_debit: '',
  hse_credit: ''
}

export default function ManageDeduction(): React.JSX.Element {
  const [rows, setRows] = useState<Deduction[]>([])
  const [names, setNames] = useState<WoListItem[]>([])
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(-1)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...blank })

  async function reload(): Promise<void> {
    const [d, n] = await Promise.all([window.api.ded.list(), window.api.wo.names()])
    setRows(d)
    setNames(n)
  }
  useEffect(() => {
    reload()
  }, [])

  const finYear = useMemo(
    () => financialYear(form.deduct_date ? new Date(form.deduct_date) : new Date()),
    [form.deduct_date]
  )

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim()
    if (!t) return rows
    return rows.filter((r) =>
      [r.fin_year, r.work_order_no, r.invoice_no, r.description, r.wo_name, r.create_status]
        .join(' ')
        .toLowerCase()
        .includes(t)
    )
  }, [rows, search])

  const totals = useMemo(() => {
    const t = {
      sdDr: 0,
      sdCr: 0,
      prsDr: 0,
      prsCr: 0,
      hseDr: 0,
      hseCr: 0
    }
    for (const r of filtered) {
      t.sdDr += r.sd_debit
      t.sdCr += r.sd_credit
      t.prsDr += r.prs_debit
      t.prsCr += r.prs_credit
      t.hseDr += r.hse_debit
      t.hseCr += r.hse_credit
    }
    return t
  }, [filtered])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function pickWo(wo: string): void {
    const match = names.find((n) => n.work_order_no === wo)
    setForm((f) => ({ ...f, work_order_no: wo, wo_name: match?.wo_name || f.wo_name }))
  }

  function clear(): void {
    setForm({ ...blank, deduct_date: todayISO() })
    setEditId(null)
    setSel(-1)
  }

  function payload(): Parameters<typeof window.api.ded.save>[0] {
    return {
      fin_year: finYear,
      work_order_no: form.work_order_no.trim(),
      invoice_no: form.invoice_no.trim(),
      deduct_date: form.deduct_date || null,
      rec_date: form.rec_date || null,
      description: form.description || null,
      hse_debit: toNum(form.hse_debit),
      hse_credit: toNum(form.hse_credit),
      prs_debit: toNum(form.prs_debit),
      prs_credit: toNum(form.prs_credit),
      sd_debit: toNum(form.sd_debit),
      sd_credit: toNum(form.sd_credit),
      create_status: form.create_status,
      wo_name: form.wo_name || null
    }
  }

  async function save(): Promise<void> {
    if (!form.work_order_no.trim()) return fail('Work Order No is required.')
    try {
      const dup = await window.api.ded.checkDup(finYear, form.work_order_no.trim(), form.invoice_no.trim())
      if (dup && !confirm('A record with the same Fin-Year, Work Order No, and Invoice No already exists. Continue saving anyway?'))
        return
      const res = await window.api.ded.save(payload())
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function loadRow(r: Deduction): void {
    setEditId(r.id)
    setForm({
      work_order_no: r.work_order_no || '',
      invoice_no: r.invoice_no || '',
      deduct_date: r.deduct_date || todayISO(),
      rec_date: r.rec_date || '',
      description: r.description || '',
      create_status: r.create_status || 'Manual',
      wo_name: r.wo_name || '',
      sd_debit: String(r.sd_debit || ''),
      sd_credit: String(r.sd_credit || ''),
      prs_debit: String(r.prs_debit || ''),
      prs_credit: String(r.prs_credit || ''),
      hse_debit: String(r.hse_debit || ''),
      hse_credit: String(r.hse_credit || '')
    })
  }

  async function update(): Promise<void> {
    if (!editId) return fail('Select a row to update first.')
    try {
      const res = await window.api.ded.update({ ...payload(), id: editId })
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  async function removeRow(r: Deduction): Promise<void> {
    if (!confirm('Delete this deduction entry?')) return
    try {
      const res = await window.api.ded.remove(r.id)
      if (res.ok) {
        toast.success(res.message)
        clear()
        reload()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function buildDownload(): DownloadPayload {
    return {
      title: 'Deduction Ledger',
      defaultBase: `Deduction_Ledger_${todayISO()}`,
      headers: [
        'Fin-Year',
        'Work Order No',
        'Invoice No',
        'Deduction Date',
        'Rec Date',
        'Description',
        'HSE (Debit)',
        'HSE (Credit)',
        'PRS (Debit)',
        'PRS (Credit)',
        'SD (Debit)',
        'SD (Credit)',
        'Create Status',
        'Name of WO'
      ],
      rows: filtered.map((r) => [
        r.fin_year,
        r.work_order_no,
        r.invoice_no,
        formatDate(r.deduct_date),
        formatDate(r.rec_date),
        r.description || '',
        r.hse_debit,
        r.hse_credit,
        r.prs_debit,
        r.prs_credit,
        r.sd_debit,
        r.sd_credit,
        r.create_status || '',
        r.wo_name || ''
      ]),
      subtotalCols: [6, 7, 8, 9, 10, 11],
      summary: [
        { label: 'SD Total', value: `Dr ${formatAmt(totals.sdDr)}  Cr ${formatAmt(totals.sdCr)}  Bal ${formatAmt(totals.sdDr - totals.sdCr)}` },
        { label: 'HSE Total', value: `Dr ${formatAmt(totals.hseDr)}  Cr ${formatAmt(totals.hseCr)}  Bal ${formatAmt(totals.hseDr - totals.hseCr)}` },
        { label: 'PRS Total', value: `Dr ${formatAmt(totals.prsDr)}  Cr ${formatAmt(totals.prsCr)}  Bal ${formatAmt(totals.prsDr - totals.prsCr)}` }
      ]
    }
  }

  const m = (k: keyof Deduction, header: string): Column<Deduction> => ({
    key: k as string,
    header,
    numeric: true,
    width: 95,
    render: (r) => {
      const v = r[k] as number
      return v ? formatAmt(v) : ''
    }
  })

  const columns: Column<Deduction>[] = [
    { key: 'fin_year', header: 'Fin-Year', width: 74, tabular: true },
    { key: 'work_order_no', header: 'Work Order', width: 95, tabular: true },
    { key: 'invoice_no', header: 'Inv No', width: 60, tabular: true },
    { key: 'deduct_date', header: 'Deduct Date', width: 96, tabular: true, render: (r) => formatDate(r.deduct_date) },
    { key: 'rec_date', header: 'Rec Date', width: 96, tabular: true, render: (r) => formatDate(r.rec_date) },
    { key: 'description', header: 'Description', width: 150, render: (r) => r.description || '' },
    m('hse_debit', 'HSE Dr'),
    m('hse_credit', 'HSE Cr'),
    m('prs_debit', 'PRS Dr'),
    m('prs_credit', 'PRS Cr'),
    m('sd_debit', 'SD Dr'),
    m('sd_credit', 'SD Cr'),
    { key: 'create_status', header: 'Status', width: 100, render: (r) => r.create_status || '' },
    { key: 'wo_name', tabular: true, header: 'Name of WO', width: 140, render: (r) => r.wo_name || '' }
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 w-full border-slate-300 bg-white pl-9 shadow-sm focus:shadow"
            placeholder="Search deductions......"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DownloadMenu build={buildDownload} />
      </div>

      {/* TOP: ledger table */}
      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          rows={filtered}
          minWidth={1500}
          defaultSortKey="invoice_no"
          selectedIndex={sel}
          onSelect={(i) => setSel(i)}
          rowActions={(r) => (
            <div className="flex items-center justify-center gap-1">
              <button
                title="Edit"
                onClick={() => loadRow(r)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-brand-600 transition hover:bg-brand-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                title="Delete"
                onClick={() => removeRow(r)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      </div>

      {/* totals */}
      <div className="grid grid-cols-3 gap-3">
        <BalBar label="SD" dr={totals.sdDr} cr={totals.sdCr} />
        <BalBar label="HSE" dr={totals.hseDr} cr={totals.hseCr} />
        <BalBar label="PRS" dr={totals.prsDr} cr={totals.prsCr} />
      </div>

      {/* BOTTOM: input controls */}
      <div className="card shrink-0 overflow-auto p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold uppercase tracking-wide leading-tight text-brand-700">
            <Scale className="h-5 w-5 shrink-0" />
            {editId ? 'Edit Deduction Entry' : 'Enter Deduction Details'}
          </h2>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 font-heading text-[13px] font-semibold text-brand-700">
            FY {finYear}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Work Order No">
            <ComboBox
              value={form.work_order_no}
              onChange={pickWo}
              options={names.map((n) => n.work_order_no)}
            />
          </Field>
          <Field label="Invoice No">
            <TextInput className="tabular" value={form.invoice_no} onChange={(e) => set('invoice_no', e.target.value)} />
          </Field>
          <Field label="Deduction Date">
            <DateInput iso={form.deduct_date} onISO={(v) => set('deduct_date', v)} />
          </Field>
          <Field label="Deduc Rec Date">
            <DateInput iso={form.rec_date} onISO={(v) => set('rec_date', v)} />
          </Field>
          <Field label="Create Status">
            <Select
              value={form.create_status}
              onChange={(v) => set('create_status', v)}
              options={[
                { value: 'Manual', label: 'Manual' },
                { value: 'Auto-Generate', label: 'Auto-Generate' }
              ]}
            />
          </Field>
          <Field label="Name of Work">
            <TextInput className="tabular" value={form.wo_name} onChange={(e) => set('wo_name', e.target.value)} />
          </Field>
          <Field label="Dr. SD Amt">
            <NumberInput value={form.sd_debit} onValue={(v) => set('sd_debit', v)} />
          </Field>
          <Field label="Cr. SD Amt">
            <NumberInput value={form.sd_credit} onValue={(v) => set('sd_credit', v)} />
          </Field>
          <Field label="Dr. PRS Amt">
            <NumberInput value={form.prs_debit} onValue={(v) => set('prs_debit', v)} />
          </Field>
          <Field label="Cr. PRS Amt">
            <NumberInput value={form.prs_credit} onValue={(v) => set('prs_credit', v)} />
          </Field>
          <Field label="Dr. HSE Amt">
            <NumberInput value={form.hse_debit} onValue={(v) => set('hse_debit', v)} />
          </Field>
          <Field label="Cr. HSE Amt">
            <NumberInput value={form.hse_credit} onValue={(v) => set('hse_credit', v)} />
          </Field>
          <Field label="Description" className="sm:col-span-2 lg:col-span-4">
            <TextInput value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            {editId ? (
              <button className="btn-primary flex-1" onClick={update}>
                <RefreshCw className="h-4 w-4" /> Update
              </button>
            ) : (
              <button className="btn-green flex-1" onClick={save}>
                <Save className="h-4 w-4" /> Save
              </button>
            )}
            <button className="btn-red flex-1" onClick={clear}>
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BalBar({ label, dr, cr }: { label: string; dr: number; cr: number }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-card">
      <span className="font-heading text-[16px] font-bold text-brand-700">{label} Total</span>
      <div className="flex gap-4 text-[14px] tabular">
        <span className="text-slate-500">Dr <b className="text-rose-600">{formatAmt(dr)}</b></span>
        <span className="text-slate-500">Cr <b className="text-emerald-600">{formatAmt(cr)}</b></span>
        <span className="text-slate-500">
          Bal{' '}
          <b className={dr - cr < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatAmt(dr - cr)}</b>
        </span>
      </div>
    </div>
  )
}
