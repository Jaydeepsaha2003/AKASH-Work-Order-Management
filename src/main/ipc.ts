import { app, ipcMain, BrowserWindow } from 'electron'
import {
  listWorkOrders,
  listWoNames,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder
} from './workorders'
import { saveInvoice, updateInvoice } from './invoices'
import {
  listDeductions,
  saveDeduction,
  updateDeduction,
  deleteDeduction,
  checkDeductionDuplicate,
  outstanding
} from './deductions'
import { verifyLogin, changePassword } from './auth'
import { exportToExcel, saveBinaryFile, type ExportRequest } from './exporter'
import { importExcel } from './importexcel'
import { backupDatabase, restoreDatabase } from './backup'
import {
  listCompanies,
  getActiveCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  setActiveCompany
} from './company'
import { logActivity, listActivity, clearActivity } from './activity'
import { getSessionUser, setSessionUser, clearSessionUser } from './session'

const money = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return isNaN(n) ? '0' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

// Channels that should be recorded in the activity log, with how to describe them.
const LOG_MAP: Record<
  string,
  { action: string; entity: string; summary: (a: any, r: any) => string }
> = {
  'wo:create': {
    action: 'Created',
    entity: 'Work Order',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no} • Total ₹${money(a.total_amt)}`
  },
  'wo:update': {
    action: 'Updated',
    entity: 'Work Order',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no} • ${a.wo_status}`
  },
  'wo:delete': { action: 'Deleted', entity: 'Work Order', summary: (a) => `Record #${a.id}` },
  'inv:save': {
    action: 'Received',
    entity: 'Invoice',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no} • Net ₹${money(a.net_amount)}`
  },
  'inv:update': {
    action: 'Updated',
    entity: 'Invoice',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no} • Net ₹${money(a.net_amount)}`
  },
  'ded:save': {
    action: 'Created',
    entity: 'Deduction',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no}`
  },
  'ded:update': {
    action: 'Updated',
    entity: 'Deduction',
    summary: (a) => `WO ${a.work_order_no} • Inv ${a.invoice_no}`
  },
  'ded:delete': { action: 'Deleted', entity: 'Deduction', summary: (a) => `Record #${a.id}` },
  'company:create': { action: 'Created', entity: 'Company', summary: (a) => a.name },
  'company:update': { action: 'Updated', entity: 'Company', summary: (a) => a.name },
  'company:delete': { action: 'Deleted', entity: 'Company', summary: (a) => `Company #${a.id}` },
  'company:setActive': {
    action: 'Switched',
    entity: 'Company',
    summary: (a) => `Active company set to #${a.id}`
  },
  'auth:changePassword': {
    action: 'Changed',
    entity: 'Password',
    summary: (a) => `User ${a.username}`
  },
  'excel:import': {
    action: 'Imported',
    entity: 'Excel',
    summary: (a, r) => `${r?.woInserted ?? 0} work orders, ${r?.dedInserted ?? 0} deductions (${a.mode})`
  },
  'db:restore': { action: 'Restored', entity: 'Database', summary: () => 'From backup file' }
}

export function registerIpc(): void {
  const handle = (channel: string, fn: (args: any, win: BrowserWindow | null) => any): void => {
    ipcMain.handle(channel, async (event, args) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await fn(args, win)
      const spec = LOG_MAP[channel]
      if (spec && (result == null || result.ok !== false)) {
        try {
          logActivity(spec.action, spec.entity, spec.summary(args, result))
        } catch {
          /* ignore logging errors */
        }
      }
      return result
    })
  }

  // Session — persisted in the DB so login survives restarts & updates
  handle('session:get', () => getSessionUser())
  handle('session:set', (a) => setSessionUser(a.username))
  handle('session:clear', () => clearSessionUser())

  // Auth
  handle('auth:login', (a) => verifyLogin(a.username, a.password))
  handle('auth:changePassword', (a) => changePassword(a.username, a.oldPassword, a.newPassword))

  // Work orders
  handle('wo:list', () => listWorkOrders())
  handle('wo:names', () => listWoNames())
  handle('wo:create', (a) => createWorkOrder(a))
  handle('wo:update', (a) => updateWorkOrder(a.id, a))
  handle('wo:delete', (a) => deleteWorkOrder(a.id))

  // Invoices
  handle('inv:save', (a) => saveInvoice(a))
  handle('inv:update', (a) => updateInvoice(a))

  // Deductions
  handle('ded:list', () => listDeductions())
  handle('ded:save', (a) => saveDeduction(a))
  handle('ded:update', (a) => updateDeduction(a))
  handle('ded:delete', (a) => deleteDeduction(a.id))
  handle('ded:checkDup', (a) => checkDeductionDuplicate(a.fin_year, a.work_order_no, a.invoice_no))
  handle('ded:outstanding', () => outstanding())

  // Excel export / import
  handle('excel:export', (a: ExportRequest, win) => exportToExcel(win, a))
  handle('excel:import', (a: { mode: 'append' | 'replace' }, win) => importExcel(win, a))
  handle('file:save', (a: { defaultName: string; base64: string }, win) => saveBinaryFile(win, a))

  // Companies (multi-tenant)
  handle('company:list', () => listCompanies())
  handle('company:active', () => getActiveCompany())
  handle('company:create', (a) => createCompany(a))
  handle('company:update', (a) => updateCompany(a.id, a))
  handle('company:delete', (a) => deleteCompany(a.id))
  handle('company:setActive', (a) => setActiveCompany(a.id))

  // Activity log
  handle('activity:list', () => listActivity())
  handle('activity:clear', () => clearActivity())

  // App info + database backup/restore
  handle('app:version', () => app.getVersion())
  handle('db:backup', (_a, win) => backupDatabase(win))
  handle('db:restore', (_a, win) => restoreDatabase(win))
}
