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

export function registerIpc(): void {
  const handle = (channel: string, fn: (args: any, win: BrowserWindow | null) => any): void => {
    ipcMain.handle(channel, async (event, args) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return fn(args, win)
    })
  }

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

  // Excel export
  handle('excel:export', (a: ExportRequest, win) => exportToExcel(win, a))
  handle('excel:import', (a: { mode: 'append' | 'replace' }, win) => importExcel(win, a))
  handle('file:save', (a: { defaultName: string; base64: string }, win) => saveBinaryFile(win, a))

  // App info + database backup/restore
  handle('app:version', () => app.getVersion())
  handle('db:backup', (_a, win) => backupDatabase(win))
  handle('db:restore', (_a, win) => restoreDatabase(win))
}
