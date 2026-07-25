import {
  LayoutDashboard,
  FilePlus2,
  ReceiptText,
  Table2,
  Scale,
  Wallet,
  Settings,
  KeyRound,
  Upload
} from 'lucide-react'
import type { Page } from '../lib/types'

export interface NavItem {
  key: Page
  label: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
}

// Primary items shown in the sidebar
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', subtitle: 'Overview & reminders', icon: LayoutDashboard },
  { key: 'create', label: 'Create WO', subtitle: 'Add work orders & invoices', icon: FilePlus2 },
  { key: 'invoice', label: 'Update Invoice', subtitle: 'Record receipts & deductions', icon: ReceiptText },
  { key: 'view', label: 'View Details', subtitle: 'Full register & reports', icon: Table2 },
  { key: 'deduction', label: 'Manage Deduction', subtitle: 'SD / HSE / PRS ledger', icon: Scale },
  { key: 'outstanding', label: 'WO Outstanding', subtitle: 'Recoverable balances', icon: Wallet }
]

// Meta for every page (for the top bar title)
export const PAGE_META: Record<Page, { label: string; subtitle: string; icon: NavItem['icon'] }> = {
  dashboard: NAV_ITEMS[0],
  create: NAV_ITEMS[1],
  invoice: NAV_ITEMS[2],
  view: NAV_ITEMS[3],
  deduction: NAV_ITEMS[4],
  outstanding: NAV_ITEMS[5],
  settings: { label: 'Settings', subtitle: 'Updates, backup & account', icon: Settings },
  password: { label: 'Change Password', subtitle: 'Account security', icon: KeyRound },
  import: { label: 'Import Excel', subtitle: 'Load .xlsm / .xlsx data', icon: Upload }
}
