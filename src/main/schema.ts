// SQLite schema for the AKASH Work Order Management System.
// Column layout mirrors the original Excel "Data" and "Deduction" sheets.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workorders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  fin_year         TEXT,            -- A  WO Fin-Year
  entry_date       TEXT,            -- B  Entry Date (ISO yyyy-mm-dd)
  work_order_no    TEXT,            -- C  Work Order No
  start_date       TEXT,            -- D  Work Start Date
  end_date         TEXT,            -- E  Work End Date
  invoice_no       TEXT,            -- F  Invoice No
  invoice_date     TEXT,            -- G  Invoice Date
  rec_date         TEXT,            -- H  Received Date
  gross_value      REAL DEFAULT 0,  -- I  Gross Value
  gst_on_gross     REAL DEFAULT 0,  -- J  GST on Gross (= Total - Gross)
  total_amt        REAL DEFAULT 0,  -- K  Total Amount
  wo_status        TEXT DEFAULT 'Created',  -- L  Created / Received / Cancelled
  cancel_remarks   TEXT,            -- M  Cancel Remarks
  income_tax       REAL DEFAULT 0,  -- N  Income Tax
  gst_2            REAL DEFAULT 0,  -- O  GST Amt (2%)
  cem_bags         REAL DEFAULT 0,  -- P  E. Cem Bag & Others
  labour_cess      REAL DEFAULT 0,  -- Q  Labour Cess
  penalty          REAL DEFAULT 0,  -- R  Penalty / Water & Elec
  land_rent        REAL DEFAULT 0,  -- S  Land Rent
  gst_rent_penalty REAL DEFAULT 0,  -- T  GST (Rent & Penalty)
  round_off        REAL DEFAULT 0,  -- U  Other & Round off
  hse              REAL DEFAULT 0,  -- V  With Hold / HSE
  price_deduction  REAL DEFAULT 0,  -- W  Price Deduction (PRS)
  sd_amt           REAL DEFAULT 0,  -- X  SD Amount
  net_amount       REAL DEFAULT 0,  -- Y  Net Amount
  wo_name          TEXT,            -- Z  Name of Work Order
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (fin_year, work_order_no, invoice_no)
);

CREATE TABLE IF NOT EXISTS deductions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fin_year      TEXT,          -- A  Fin-Year
  work_order_no TEXT,          -- B  Work Order No
  invoice_no    TEXT,          -- C  Invoice No
  deduct_date   TEXT,          -- D  Deduction Date
  rec_date      TEXT,          -- E  Received Date
  description   TEXT,          -- F  Description
  hse_debit     REAL DEFAULT 0,-- G  HSE (Debit)
  hse_credit    REAL DEFAULT 0,-- H  HSE (Credit)
  prs_debit     REAL DEFAULT 0,-- I  PRS (Debit)
  prs_credit    REAL DEFAULT 0,-- J  PRS (Credit)
  sd_debit      REAL DEFAULT 0,-- K  SD (Debit)
  sd_credit     REAL DEFAULT 0,-- L  SD (Credit)
  create_status TEXT,          -- M  Auto-Generate / Manual
  wo_name       TEXT,          -- O  Name of Work Order
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Master list of work orders (name lookup for combo boxes)
CREATE TABLE IF NOT EXISTS work_order_list (
  work_order_no TEXT PRIMARY KEY,
  wo_name       TEXT
);

CREATE INDEX IF NOT EXISTS idx_wo_status ON workorders (wo_status);
CREATE INDEX IF NOT EXISTS idx_wo_no ON workorders (work_order_no);
CREATE INDEX IF NOT EXISTS idx_ded_wo ON deductions (work_order_no);
`
