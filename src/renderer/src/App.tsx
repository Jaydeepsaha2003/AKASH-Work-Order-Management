import { useCallback, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import type { AuthUser, Company, Page } from './lib/types'
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
import Companies from './pages/Companies'
import ActivityLog from './pages/ActivityLog'
import Sidebar from './components/Sidebar'
import UpdateBanner from './components/UpdateBanner'
import { PAGE_META } from './components/nav'
import { getSession, setSession, clearSession } from './lib/session'

export default function App(): React.JSX.Element {
  const [user, setUserState] = useState<AuthUser | null>(() => getSession())
  const [page, setPage] = useState<Page>('dashboard')
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompany] = useState<Company | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // tell the main process who is acting (for the activity log), incl. on a restored session
  useEffect(() => {
    if (user) window.api?.session?.setUser(user.username)
  }, [user])

  const setUser = (u: AuthUser): void => {
    setSession(u)
    setUserState(u)
  }
  const logout = (): void => {
    clearSession()
    setUserState(null)
  }

  const loadCompanies = useCallback(async () => {
    const [list, active] = await Promise.all([
      window.api.company.list(),
      window.api.company.active()
    ])
    setCompanies(list)
    setActiveCompany(active)
  }, [])

  useEffect(() => {
    if (user) loadCompanies()
  }, [user, loadCompanies])

  async function switchCompany(id: number): Promise<void> {
    await window.api.company.setActive(id)
    await loadCompanies()
    setRefreshKey((k) => k + 1) // remount current page so it refetches scoped data
  }

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <UpdateBanner />
        <Toaster position="top-right" richColors />
      </>
    )
  }

  const meta = PAGE_META[page]
  const MetaIcon = meta.icon

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar
        page={page}
        onNavigate={setPage}
        username={user.username}
        onLogout={logout}
        companies={companies}
        activeCompany={activeCompany}
        onSwitchCompany={switchCompany}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <MetaIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-[19px] font-bold leading-tight text-slate-800">
              {meta.label}
            </h1>
            <p className="text-[13.5px] text-slate-500">{meta.subtitle}</p>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-hidden p-4">
          <div key={`${page}-${refreshKey}`} className="h-full animate-fade-in">
            {page === 'dashboard' && <Dashboard username={user.username} onNavigate={setPage} />}
            {page === 'create' && <CreateWO />}
            {page === 'invoice' && <UpdateInvoice />}
            {page === 'view' && <ViewDetails />}
            {page === 'deduction' && <ManageDeduction />}
            {page === 'outstanding' && <WoOutstanding />}
            {page === 'password' && (
              <ChangePassword username={user.username} onDone={() => setPage('dashboard')} />
            )}
            {page === 'import' && <ImportData onDone={() => setPage('dashboard')} />}
            {page === 'settings' && <Settings onNavigate={setPage} />}
            {page === 'companies' && <Companies onChanged={loadCompanies} />}
            {page === 'activity' && <ActivityLog />}
          </div>
        </main>
      </div>

      <UpdateBanner />
      <Toaster position="top-right" richColors />
    </div>
  )
}
