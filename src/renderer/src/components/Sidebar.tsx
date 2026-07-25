import { Settings, LogOut } from 'lucide-react'
import type { Page } from '../lib/types'
import { NAV_ITEMS } from './nav'
import { cn } from './ui'

export default function Sidebar({
  page,
  onNavigate,
  username,
  onLogout
}: {
  page: Page
  onNavigate: (p: Page) => void
  username: string
  onLogout: () => void
}): React.JSX.Element {
  return (
    <aside className="app-gradient relative flex h-full w-64 shrink-0 flex-col text-white">
      {/* glow accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-24 -right-6 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" />
      </div>

      {/* Brand */}
      <div className="relative flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur">
          A
        </div>
        <div className="leading-tight">
          <div className="font-heading text-[17px] font-bold tracking-wide">AKASH</div>
          <div className="text-[11px] text-white/70">Work Order System</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = page === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                active
                  ? 'bg-white/20 shadow-sm backdrop-blur'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition',
                  active ? 'bg-white text-brand-700' : 'bg-white/10 text-white group-hover:bg-white/20'
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-heading text-[14px] font-semibold">
                  {item.label}
                </span>
                <span className="block truncate text-[11px] text-white/60">{item.subtitle}</span>
              </span>
              {active && <span className="h-6 w-1 rounded-full bg-white" />}
            </button>
          )
        })}
      </nav>

      {/* Footer: settings + user */}
      <div className="relative space-y-2 border-t border-white/15 p-3">
        <button
          onClick={() => onNavigate('settings')}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition',
            page === 'settings'
              ? 'bg-white/20 backdrop-blur'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              page === 'settings' ? 'bg-white text-brand-700' : 'bg-white/10'
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
          </span>
          <span className="font-heading text-[14px] font-semibold">Settings</span>
        </button>

        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[15px] font-bold text-brand-700">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-white/60">Signed in as</div>
            <div className="truncate font-heading text-[14px] font-semibold">{username}</div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/25 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
