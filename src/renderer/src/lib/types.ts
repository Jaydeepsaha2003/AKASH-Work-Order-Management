export interface WorkOrder {
  id: number
  fin_year: string
  entry_date: string | null
  work_order_no: string
  start_date: string | null
  end_date: string | null
  invoice_no: string
  invoice_date: string | null
  rec_date: string | null
  gross_value: number
  gst_on_gross: number
  total_amt: number
  wo_status: string
  cancel_remarks: string | null
  income_tax: number
  gst_2: number
  cem_bags: number
  labour_cess: number
  penalty: number
  land_rent: number
  gst_rent_penalty: number
  round_off: number
  hse: number
  price_deduction: number
  sd_amt: number
  net_amount: number
  wo_name: string | null
}

export interface Deduction {
  id: number
  fin_year: string
  work_order_no: string
  invoice_no: string
  deduct_date: string | null
  rec_date: string | null
  description: string | null
  hse_debit: number
  hse_credit: number
  prs_debit: number
  prs_credit: number
  sd_debit: number
  sd_credit: number
  create_status: string | null
  wo_name: string | null
}

export interface WoListItem {
  work_order_no: string
  wo_name: string | null
}

export interface OutstandingRow {
  work_order_no: string
  wo_name: string | null
  sd_debit: number
  sd_credit: number
  hse_debit: number
  hse_credit: number
  prs_debit: number
  prs_credit: number
  sd_balance: number
  hse_balance: number
  prs_balance: number
}

export interface AuthUser {
  id: number
  username: string
}

export interface Company {
  id: number
  name: string
  address: string | null
  gstin: string | null
  logo: string | null
}

export interface ActivityRow {
  id: number
  ts: string
  username: string | null
  company_name: string | null
  action: string | null
  entity: string | null
  summary: string | null
}

export type Page =
  | 'dashboard'
  | 'create'
  | 'invoice'
  | 'view'
  | 'deduction'
  | 'outstanding'
  | 'password'
  | 'import'
  | 'settings'
  | 'companies'
  | 'activity'
