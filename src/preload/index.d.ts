import type {
  WorkOrder,
  Deduction,
  WoListItem,
  OutstandingRow,
  AuthUser,
  WoCreateInput,
  InvoiceInput,
  DeductionInput,
  Company,
  CompanyInput
} from '../main/types'

export interface ExportRequest {
  defaultName: string
  headers: string[]
  rows: (string | number)[][]
  subtotalCols?: number[]
  summary?: { label: string; value: string }[]
}

type Res = { ok: boolean; message: string }

export interface Api {
  auth: {
    login: (username: string, password: string) => Promise<AuthUser | null>
    changePassword: (
      username: string,
      oldPassword: string,
      newPassword: string
    ) => Promise<Res>
  }
  wo: {
    list: () => Promise<WorkOrder[]>
    names: () => Promise<WoListItem[]>
    create: (values: WoCreateInput) => Promise<Res>
    update: (
      values: WoCreateInput & { id: number; wo_status: string; cancel_remarks: string | null }
    ) => Promise<Res>
    remove: (id: number) => Promise<Res>
  }
  inv: {
    save: (values: InvoiceInput) => Promise<Res>
    update: (values: InvoiceInput) => Promise<Res>
  }
  ded: {
    list: () => Promise<Deduction[]>
    save: (values: DeductionInput) => Promise<Res & { duplicate?: boolean }>
    update: (values: DeductionInput) => Promise<Res>
    remove: (id: number) => Promise<Res>
    checkDup: (fin_year: string, work_order_no: string, invoice_no: string) => Promise<boolean>
    outstanding: () => Promise<OutstandingRow[]>
  }
  excel: {
    export: (req: ExportRequest) => Promise<Res & { path?: string }>
    import: (
      mode: 'append' | 'replace'
    ) => Promise<Res & { woInserted?: number; woSkipped?: number; dedInserted?: number }>
  }
  file: {
    save: (req: { defaultName: string; base64: string }) => Promise<Res & { path?: string }>
  }
  update: {
    onStatus: (cb: (data: UpdateStatus) => void) => () => void
    check: () => Promise<{ ok: boolean; message?: string }>
    install: () => Promise<{ ok: boolean }>
  }
  company: {
    list: () => Promise<Company[]>
    active: () => Promise<Company | null>
    create: (values: CompanyInput) => Promise<Res & { id?: number }>
    update: (values: CompanyInput & { id: number }) => Promise<Res>
    remove: (id: number) => Promise<Res>
    setActive: (id: number) => Promise<Res>
  }
  app: {
    version: () => Promise<string>
  }
  db: {
    backup: () => Promise<Res & { path?: string }>
    restore: () => Promise<Res>
  }
}

export interface UpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error'
  version?: string
  percent?: number
  message?: string
}

declare global {
  interface Window {
    api: Api
  }
}
