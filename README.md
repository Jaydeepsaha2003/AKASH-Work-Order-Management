# AKASH Work Order Management System

A modern desktop rebuild of the original `.xlsm` VBA Work Order tool — Electron + React +
TypeScript + Tailwind, backed by a **local SQLite database** (`better-sqlite3`). Runs fully
offline as a Windows `.exe`.

## Install (for the end user)

1. Run **`release/AKASH-Work-Order-Setup-1.0.0.exe`**.
2. Choose an install folder, finish the wizard — a Desktop + Start-Menu shortcut is created.
3. Launch **AKASH Work Order**. Log in with:
   - `Prahlad` / `123456`
   - `jaydeep` / `123456`
   - Change either password from the 🔑 icon (top-right).

Your data lives in a single local SQLite file at:
`%APPDATA%\akash-work-order\akash-wom.sqlite`

## The five screens

The UI uses **Poppins** throughout, with **Calibri** reserved for numbers (aligned, tabular
figures), a **side navigation bar**, and every report is downloadable as **Excel or PDF**.

**Multiple companies:** the app manages several companies in one place. Use the **company switcher**
at the top of the sidebar to switch the active company (all screens then show only that company's
data), and **Companies** (Manage companies) to add/edit/delete companies with a **name, GSTIN,
address, and logo**. The active company's **logo + name/GSTIN/address are printed on every PDF
report**. Existing single-company databases upgrade automatically on first launch — your data is
moved into a default "My Company" and nothing is lost.

| Screen | What it does |
|--------|--------------|
| **Dashboard** | **Date-range filter** (This Month / This FY / All / custom) + KPIs: Turnover excl GST, this-month invoice count & value, cancelled invoices, work orders. **SD / HSE / PRS pending till date**, turnover-by-FY bar chart, WO status donut, and a **Pending Invoices** table showing days pending. |
| **Activity Log** | Full audit trail — every create / update / delete / import / restore is recorded with the user, company, timestamp, and details. Searchable; clearable. |
| **Create WO** | Enter work order + invoice. GST by % *or* amount → auto Total. Edit / Update / Delete. Footer shows Turnover, GST Total, Landed Amt. |
| **Update Inv** | Double-click a *Created* WO, enter all deductions (Income Tax, HSE, PRS, SD, Cement, Labour Cess, Penalty, Land Rent, GST 2%, etc.) → auto **Net Amount**, marks WO *Received*, and auto-posts a deduction ledger entry. "Edit Mode" lets you revise *Received* invoices. |
| **View Details** | Full 26-column register with search. Download full report or "deduction data only" to Excel (with subtotals). SD / HSE / PRS totals. |
| **Manage Deduction** | Dr/Cr ledger for SD, HSE, PRS per work order. Add manual entries, edit, delete, export. Live Dr/Cr/Balance bars. |
| **WO Outstanding** | SD / HSE / PRS balance per work order (debits − credits) + grand totals. Export. |
| **Settings** (⚙ header) | Current version + **Check for updates**, **Backup database** (to a single `.sqlite` file), **Restore from backup**, Import from Excel, and Change password. |

### Backup / moving to another computer

Settings → **Backup database** writes a single `.sqlite` file containing everything. To move the
app (with data) to another PC: install the app there, then Settings → **Restore from backup** and
pick that file — it replaces the local data and restarts. The database also survives every
auto-update, so your client keeps their data when the app updates itself.

All GST math, the duplicate-entry check, the Net Amount formula, the auto-ledger, and the
delete guards replicate the original VBA exactly.

### Import your old Excel data

Click the **⬆ Import** icon (top-right) to load your existing `.xlsm` / `.xlsx`:

- Reads the **Data** and **Deduction** sheets using the original column layout.
- **Replace all** — clears the app's data first, then imports (best for a clean one-time load).
- **Append** — adds rows on top; duplicate work orders (same Fin-Year + WO + Invoice) are skipped.

Verified against the original file: 137 work orders + 189 deductions import correctly, and the
resulting SD / HSE / PRS outstanding totals match the Excel sheet to the paisa.

## Download & auto-update

- **Latest installer:** https://github.com/Jaydeepsaha2003/AKASH-Work-Order-Management/releases/latest
- The app **updates itself**. On launch (and every 6 hours) it checks GitHub Releases; if a newer
  version exists it downloads it in the background and shows a **"Restart & Update"** pill in the
  bottom-right. One click applies it — no reinstall, and the local database is untouched.

### Shipping a new version (for the developer)

1. Make your changes.
2. Bump `"version"` in `package.json` (e.g. `1.0.1`).
3. Commit, then tag and push:

```bash
git add -A && git commit -m "Release v1.0.1" && git push
git tag v1.0.1 && git push origin v1.0.1
```

The **Build & Release** GitHub Action builds the Windows installer and publishes it (plus
`latest.yml` + blockmap) to a new GitHub Release. Every running copy of the app picks it up
automatically. That's the whole process — users never touch GitHub.

## Developer commands

```bash
npm install        # installs deps + rebuilds better-sqlite3 for Electron
npm run dev        # hot-reload dev app
npm run typecheck  # TS check (main + renderer)
npm run build      # compile bundles
npm run build:win  # produce the Windows installer in release/
```

- **Renderer** edits hot-reload. **Main-process** edits (`src/main/**`) need an app restart.
- To ship a new version: bump `version` in `package.json`, then `npm run build:win`.

## Architecture

```
src/
├─ main/        Electron main — all DB access lives here
│  ├─ db.ts        better-sqlite3 client + schema init + user seeding
│  ├─ schema.ts    CREATE TABLE statements (workorders, deductions, users, work_order_list)
│  ├─ workorders.ts / invoices.ts / deductions.ts / auth.ts   business logic
│  ├─ exporter.ts  Excel export via ExcelJS + native save dialog
│  ├─ ipc.ts       ipcMain handlers
│  └─ index.ts     app bootstrap + window
├─ preload/     contextBridge → window.api (the only surface the UI can call)
└─ renderer/    React UI (Poppins headings, Calibri body, purple gradient theme)
   └─ src/pages/  Login, CreateWO, UpdateInvoice, ViewDetails, ManageDeduction,
                  WoOutstanding, ChangePassword
```

The renderer never touches the database directly — it calls `window.api.*` → IPC → a main
module. The SQLite file stays entirely on the local machine.
