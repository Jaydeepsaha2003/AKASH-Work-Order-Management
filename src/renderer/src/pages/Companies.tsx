import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Check,
  ImagePlus,
  X,
  Save,
  Eraser
} from 'lucide-react'
import type { Company } from '../lib/types'
import { Field, TextInput, cn } from '../components/ui'
import { errText } from '../lib/format'

// Read an image file and downscale it to a compact PNG data URL (keeps the DB small
// and the PDF logo crisp).
function fileToLogo(file: File, maxSize = 260): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas unsupported'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('invalid image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('could not read file'))
    reader.readAsDataURL(file)
  })
}

const blank = { name: '', address: '', gstin: '', logo: '' as string | null }

export default function Companies({
  onChanged
}: {
  onChanged: () => void
}): React.JSX.Element {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...blank })
  const [editId, setEditId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload(): Promise<void> {
    const [list, active] = await Promise.all([
      window.api.company.list(),
      window.api.company.active()
    ])
    setCompanies(list)
    setActiveId(active?.id ?? null)
  }
  useEffect(() => {
    reload()
  }, [])

  const editingName = useMemo(
    () => (editId ? companies.find((c) => c.id === editId)?.name : ''),
    [editId, companies]
  )

  function clear(): void {
    setForm({ ...blank })
    setEditId(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function pickLogo(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const logo = await fileToLogo(file)
      setForm((f) => ({ ...f, logo }))
    } catch (err) {
      toast.error(errText(err))
    }
  }

  async function save(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('Company name is required.')
      return
    }
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address || null,
        gstin: form.gstin || null,
        logo: form.logo || null
      }
      const res = editId
        ? await window.api.company.update({ ...payload, id: editId })
        : await window.api.company.create(payload)
      if (res.ok) {
        toast.success(res.message)
        clear()
        await reload()
        onChanged()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  function edit(c: Company): void {
    setEditId(c.id)
    setForm({ name: c.name, address: c.address || '', gstin: c.gstin || '', logo: c.logo })
  }

  async function setActive(id: number): Promise<void> {
    try {
      const res = await window.api.company.setActive(id)
      if (res.ok) {
        toast.success('Active company changed.')
        await reload()
        onChanged()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  async function remove(c: Company): Promise<void> {
    if (
      !confirm(
        `Delete "${c.name}"?\n\nThis permanently removes the company AND all its work orders and deductions. This cannot be undone.`
      )
    )
      return
    try {
      const res = await window.api.company.remove(c.id)
      if (res.ok) {
        toast.success(res.message)
        await reload()
        onChanged()
      } else toast.error(res.message)
    } catch (e) {
      toast.error(errText(e))
    }
  }

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="mx-auto max-w-5xl space-y-4 pb-4">
        {/* Form */}
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-heading text-[17px] font-semibold text-slate-800">
              {editId ? `Edit "${editingName}"` : 'Add a company'}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-[auto,1fr]">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                {form.logo ? (
                  <img src={form.logo} alt="logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={pickLogo}
              />
              <div className="flex gap-1.5">
                <button className="btn-ghost h-8 px-2.5 text-[13px]" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-3.5 w-3.5" /> Logo
                </button>
                {form.logo && (
                  <button
                    className="btn-ghost h-8 px-2.5 text-[13px]"
                    onClick={() => setForm((f) => ({ ...f, logo: null }))}
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company Name" className="sm:col-span-2">
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Akash Enterprises"
                />
              </Field>
              <Field label="GSTIN">
                <TextInput
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Address">
                <TextInput
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Optional — shown on PDF reports"
                />
              </Field>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="btn-green" onClick={save}>
              <Save className="h-4 w-4" /> {editId ? 'Update Company' : 'Add Company'}
            </button>
            {editId && (
              <button className="btn-red" onClick={clear}>
                <Eraser className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const active = c.id === activeId
            return (
              <div
                key={c.id}
                className={cn(
                  'card flex flex-col gap-3 p-4',
                  active && 'ring-2 ring-brand-400'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                    {c.logo ? (
                      <img src={c.logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="font-heading text-lg font-bold text-brand-600">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-heading text-[16px] font-semibold text-slate-800">
                      {c.name}
                    </div>
                    <div className="truncate text-[13px] text-slate-500">
                      {c.gstin || c.address || 'No details'}
                    </div>
                  </div>
                  {active && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {!active && (
                    <button
                      className="btn-primary h-8 flex-1 px-2 text-[13.5px]"
                      onClick={() => setActive(c.id)}
                    >
                      <Check className="h-3.5 w-3.5" /> Set active
                    </button>
                  )}
                  <button
                    className="btn-ghost h-8 px-2.5 text-[13.5px]"
                    onClick={() => edit(c)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="btn-ghost h-8 px-2.5 text-[13.5px] text-rose-600"
                    onClick={() => remove(c)}
                    title="Delete"
                    disabled={companies.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add tile */}
          <button
            onClick={clear}
            className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-brand-300 hover:text-brand-500"
          >
            <Plus className="h-6 w-6" />
            <span className="text-[14px] font-semibold">New company (use the form above)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
