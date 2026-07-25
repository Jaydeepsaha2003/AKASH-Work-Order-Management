import { useState } from 'react'
import { Toaster } from 'sonner'
import {
  LayoutDashboard,
  FilePlus2,
  ReceiptText,
  Table2,
  Scale,
  Wallet,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react'
import type { AuthUser, Page } from './lib/types'
import { cn } from './components/ui'
import Login from './pages/Login'
import CreateWO from './pages/CreateWO'
import UpdateInvoice from './pages/UpdateInvoice'
import ViewDetails from './pages/ViewDetails'
import ManageDeduction from './pages/ManageDeduction'
import WoOutstanding from './pages/WoOutstanding'
import ChangePassword from './pages/ChangePassword'
import ImportData from './pages/ImportData'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import UpdateBanner from './components/UpdateBanner'

const NAV: { key: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'create', label: 'Create WO', icon: FilePlus2 },
  { key: 'invoice', label: 'Update Inv', icon: ReceiptText },
  { key: 'view', label: 'View Details', icon: Table2 },
  { key: 'deduction', label: 'Manage Deduction', icon: Scale },
  { key: 'outstanding', label: 'WO Outstanding', icon: Wallet }
]

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [page, setPage] = useState<Page>('dashboard')

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <UpdateBanner />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)]">
      {/* Header */}
      <header className="app-gradient relative flex items-center justify-between px-6 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white backdrop-blur">
            A
          </div>
          <div>
            <h1 className="font-heading text-[17px] font-bold leading-tight text-white">
              AKASH Work Order Management System
            </h1>
            <p className="text-[12px] text-white/70">Contracts • Invoices • Deductions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-[12px] text-white/70">Signed in as</div>
            <div className="font-heading text-[14px] font-semibold text-white">{user.username}</div>
          </div>
          <button
            title="Settings"
            onClick={() => setPage('settings')}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>
          <button
            title="Logout"
            onClick={() => setUser(null)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = page === n.key
          return (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 font-heading text-[13.5px] font-semibold transition',
                active
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
                  : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </button>
          )
        })}
      </nav>

      {/* Page body */}
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full animate-fade-in">
          {page === 'dashboard' && <Dashboard username={user.username} onNavigate={setPage} />}
          {page === 'create' && <CreateWO />}
          {page === 'invoice' && <UpdateInvoice />}
          {page === 'view' && <ViewDetails />}
          {page === 'deduction' && <ManageDeduction />}
          {page === 'outstanding' && <WoOutstanding />}
          {page === 'password' && (
            <ChangePassword username={user.username} onDone={() => setPage('create')} />
          )}
          {page === 'import' && <ImportData onDone={() => setPage('create')} />}
          {page === 'settings' && <Settings onNavigate={setPage} />}
        </div>
      </main>

      <UpdateBanner />
      <Toaster position="top-right" richColors />
    </div>
  )
}
