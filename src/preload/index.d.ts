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
  CompanyInput,
  ActivityRow,
  WoMaster,
  WoMasterInput
} from '../main/types'

export interface ExportRequest {
  defaultName: string
  headers: string[]
  rows: (string | number)[][]
  subtotalCols?: number[]
  summary?: { label: string; value: string }[]
}

type Res = { ok: boolean; message: string }

export interface Attachment {
  id: number
  company_id: number
  scope: string
  ref_key: string
  filename: string
  original_name: string | null
  created_at: string
}

export interface FileRef {
  filename: string
  originalName: string
}

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
    importExcel: (
      mode: 'append' | 'replace'
    ) => Promise<Res & { woInserted?: number; woSkipped?: number }>
  }
  wom: {
    list: () => Promise<WoMaster[]>
    create: (values: WoMasterInput) => Promise<Res>
    update: (values: WoMasterInput & { id: number }) => Promise<Res>
    remove: (id: number) => Promise<Res>
    importExcel: (mode: 'append' | 'replace') => Promise<Res & { woInserted?: number }>
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
    importExcel: (mode: 'append' | 'replace') => Promise<Res & { dedInserted?: number }>
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
  attach: {
    upload: () => Promise<Res & { files?: FileRef[] }>
    sync: (input: { scope: string; refKey: string; files: FileRef[] }) => Promise<Res>
    list: (input: { scope: string; refKey: string }) => Promise<Attachment[]>
    open: (filename: string) => Promise<Res>
  }
  update: {
    onStatus: (cb: (data: UpdateStatus) => void) => () => void
    check: () => Promise<{
      ok: boolean
      message?: string
      available?: boolean
      version?: string
      current?: string
    }>
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
  session: {
    get: () => Promise<AuthUser | null>
    set: (username: string) => Promise<Res>
    clear: () => Promise<Res>
  }
  activity: {
    list: () => Promise<ActivityRow[]>
    clear: () => Promise<Res>
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
