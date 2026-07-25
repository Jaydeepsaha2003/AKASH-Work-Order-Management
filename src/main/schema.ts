// SQLite schema for the AKASH Work Order Management System (multi-company).
// Column layout mirrors the original Excel "Data" and "Deduction" sheets,
// with a company_id scoping every business row.

// Reused for both fresh creation and the migration rebuild, so the constraints stay in sync.
export const WORKORDERS_BODY = `
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id       INTEGER NOT NULL DEFAULT 1,
  fin_year         TEXT,
  entry_date       TEXT,
  work_order_no    TEXT,
  start_date       TEXT,
  end_date         TEXT,
  invoice_no       TEXT,
  invoice_date     TEXT,
  rec_date         TEXT,
  gross_value      REAL DEFAULT 0,
  gst_on_gross     REAL DEFAULT 0,
  total_amt        REAL DEFAULT 0,
  wo_status        TEXT DEFAULT 'Created',
  cancel_remarks   TEXT,
  income_tax       REAL DEFAULT 0,
  gst_2            REAL DEFAULT 0,
  cem_bags         REAL DEFAULT 0,
  labour_cess      REAL DEFAULT 0,
  penalty          REAL DEFAULT 0,
  land_rent        REAL DEFAULT 0,
  gst_rent_penalty REAL DEFAULT 0,
  round_off        REAL DEFAULT 0,
  hse              REAL DEFAULT 0,
  price_deduction  REAL DEFAULT 0,
  sd_amt           REAL DEFAULT 0,
  net_amount       REAL DEFAULT 0,
  wo_name          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (company_id, fin_year, work_order_no, invoice_no)
`

export const DEDUCTIONS_BODY = `
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL DEFAULT 1,
  fin_year      TEXT,
  work_order_no TEXT,
  invoice_no    TEXT,
  deduct_date   TEXT,
  rec_date      TEXT,
  description   TEXT,
  hse_debit     REAL DEFAULT 0,
  hse_credit    REAL DEFAULT 0,
  prs_debit     REAL DEFAULT 0,
  prs_credit    REAL DEFAULT 0,
  sd_debit      REAL DEFAULT 0,
  sd_credit     REAL DEFAULT 0,
  create_status TEXT,
  wo_name       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
`

export const WO_LIST_BODY = `
  company_id    INTEGER NOT NULL DEFAULT 1,
  work_order_no TEXT,
  wo_name       TEXT,
  PRIMARY KEY (company_id, work_order_no)
`

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS companies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  address    TEXT,
  gstin      TEXT,
  logo       TEXT,           -- data-URL (PNG/JPEG) or NULL
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS workorders (${WORKORDERS_BODY});

CREATE TABLE IF NOT EXISTS deductions (${DEDUCTIONS_BODY});

CREATE TABLE IF NOT EXISTS work_order_list (${WO_LIST_BODY});

CREATE TABLE IF NOT EXISTS activity_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL DEFAULT (datetime('now')),
  username     TEXT,
  company_name TEXT,
  action       TEXT,   -- Created / Updated / Deleted / Imported / etc.
  entity       TEXT,   -- Work Order / Invoice / Deduction / Company / …
  summary      TEXT    -- human-readable details
);
`

export const INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_wo_company ON workorders (company_id);
CREATE INDEX IF NOT EXISTS idx_wo_status ON workorders (company_id, wo_status);
CREATE INDEX IF NOT EXISTS idx_wo_no ON workorders (company_id, work_order_no);
CREATE INDEX IF NOT EXISTS idx_ded_company ON deductions (company_id);
CREATE INDEX IF NOT EXISTS idx_ded_wo ON deductions (company_id, work_order_no);
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log (ts DESC);
`
