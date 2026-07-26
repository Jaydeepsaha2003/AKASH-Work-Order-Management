import { useEffect, useRef, useState } from 'react'
import { Settings, LogOut, Building2, ChevronsUpDown, Check, Plus, Search } from 'lucide-react'
import type { Page, Company } from '../lib/types'
import { NAV_ITEMS } from './nav'
import { cn } from './ui'

const RAIL = 76 // collapsed width (px)
const EXPANDED = 264 // expanded width (px)

export default function Sidebar({
  page,
  onNavigate,
  username,
  onLogout,
  companies,
  activeCompany,
  onSwitchCompany
}: {
  page: Page
  onNavigate: (p: Page) => void
  username: string
  onLogout: () => void
  companies: Company[]
  activeCompany: Company | null
  onSwitchCompany: (id: number) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyQ, setCompanyQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companyQ.toLowerCase())
  )

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setCompanyOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const collapse = (): void => {
    setExpanded(false)
    setCompanyOpen(false)
    setCompanyQ('')
  }

  return (
    <>
      {/* spacer keeps the collapsed rail width in the layout; the fixed aside overlays on hover */}
      <div className="h-full shrink-0" style={{ width: RAIL }} />
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={collapse}
        style={{ width: expanded ? EXPANDED : RAIL }}
        className={cn(
          'sidebar-bg fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden text-white transition-[width] duration-200 ease-out',
          expanded && 'shadow-2xl'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-glow">
            A
          </div>
          <div className={cn('leading-tight transition-opacity', expanded ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <div className="whitespace-nowrap font-heading text-[18px] font-bold tracking-wide">AKASH</div>
            <div className="whitespace-nowrap text-[12px] text-white/50">Work Order System</div>
          </div>
        </div>

        {/* Company switcher */}
        <div className="relative px-3 pb-3" ref={ref}>
          <button
            onClick={() => expanded && setCompanyOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl bg-white/[0.06] py-2 text-left transition hover:bg-white/[0.12]',
              expanded ? 'px-2.5' : 'justify-center px-0'
            )}
            title={activeCompany?.name ?? 'Company'}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              {activeCompany?.logo ? (
                <img src={activeCompany.logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-4.5 w-4.5 text-brand-700" />
              )}
            </span>
            {expanded && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] uppercase tracking-wide text-white/45">Company</span>
                  <span className="block truncate font-heading text-[14.5px] font-semibold">
                    {activeCompany?.name ?? 'Select…'}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 text-white/50" />
              </>
            )}
          </button>

          {expanded && companyOpen && (
            <div className="dropdown-panel absolute left-3 right-3 z-50 mt-1.5 text-slate-700">
              {companies.length > 6 && (
                <div className="dropdown-search">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    autoFocus
                    className="w-full bg-transparent text-[14px] outline-none"
                    placeholder="Search company…"
                    value={companyQ}
                    onChange={(e) => setCompanyQ(e.target.value)}
                  />
                </div>
              )}
              <div className="dropdown-list">
                {filteredCompanies.length === 0 && (
                  <div className="px-4 py-2 text-[14px] text-slate-400">No matches</div>
                )}
                {filteredCompanies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyOpen(false)
                      if (c.id !== activeCompany?.id) onSwitchCompany(c.id)
                    }}
                    className={cn(
                      'dropdown-item',
                      c.id === activeCompany?.id && 'dropdown-item-active'
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                      {c.logo ? (
                        <img src={c.logo} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[13px] font-bold text-brand-600">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    {c.id === activeCompany?.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                  </button>
                ))}
              </div>
              <div className="dropdown-divider" />
              <button
                onClick={() => {
                  setCompanyOpen(false)
                  onNavigate('companies')
                }}
                className="dropdown-item font-semibold text-brand-700"
              >
                <Plus className="h-4 w-4" /> Manage companies
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = page === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={item.menuLabel ?? item.label}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl py-2.5 text-left transition',
                  expanded ? 'px-3' : 'justify-center px-0',
                  active
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
                    active ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-slate-300 group-hover:text-white'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {expanded && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-[15px] font-semibold text-white">
                      {item.menuLabel ?? item.label}
                    </span>
                    <span
                      className={cn(
                        'block truncate text-[12px]',
                        active ? 'text-white/70' : 'text-white/40'
                      )}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer: settings + user */}
        <div className="space-y-2 border-t border-white/10 p-3">
          <button
            onClick={() => onNavigate('settings')}
            title="Settings"
            className={cn(
              'flex w-full items-center gap-3 rounded-xl py-2.5 transition',
              expanded ? 'px-3' : 'justify-center px-0',
              page === 'settings'
                ? 'bg-white/15'
                : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
              <Settings className="h-[18px] w-[18px]" />
            </span>
            {expanded && <span className="font-heading text-[15px] font-semibold text-white">Settings</span>}
          </button>

          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-white/[0.06] py-2',
              expanded ? 'px-3' : 'justify-center px-0'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[16px] font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
            {expanded && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-white/45">Signed in as</div>
                  <div className="truncate font-heading text-[15px] font-semibold">{username}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/25 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
