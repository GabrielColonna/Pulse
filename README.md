# Budget Pulse Dashboard

A dashboard that reduces Excel usage by combining:

- A quick input widget (form-like entry)
- Automatic category classification based on description keywords
- Permanent project storage in SQLite (`budget.db`)
- Excel import to prefill your current data
- Instant analytics and recent transaction visibility

## Category Rules (from your Excel setup)

- Income categories (first 5): `WEEK`, `GAM`, `RSL`, `FAA`, `OTH`
- Expense categories: `MEM`, `VAC`, `INV`, `LSS`, `GAS`, `INS`, `OIL`, `TOL`, `PAR`, `OTH2`, `GIFT`, `DATE`, `OTH3`, `ENT`, `FOOD`, `CUT`, `GROC`, `SOCC`, `PSN`, `SHOP`, `OTH4`, `CAR`

Quick Add only uses these categories, and auto-suggestion maps descriptions into this list.

## Run Locally

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Open: `http://localhost:4100`

Your data is stored in `budget.db`, so it remains in the project even after closing the browser.

## Import Your Existing Excel

1. Open the dashboard.
2. In **Import Existing Excel**, choose your workbook (`.xlsx`/`.xls`).
3. Click **Import Excel**.

The importer auto-detects typical headers such as Date, Description/Merchant, Amount, Type, and Category.

## Multi-Device Access (Phone + Laptop)

To use one shared dashboard from multiple devices, run this project on one machine/server and open that same server URL from each device.

For home network access:

1. Start the server with `npm start`.
2. Find your computer IP, for example `192.168.1.25`.
3. Open `http://192.168.1.25:4100` on phone/laptop connected to the same Wi-Fi.

All devices will read and write the same `budget.db` data.

## How It Works

- Entries are stored in SQLite through `/api/transactions`.
- Excel import uses `/api/import-excel` and inserts rows into the same database.
- Dashboard cards update automatically:
  - Current Balance
  - Total Income
  - Total Expenses
  - Savings Rate
- Chart views show:
  - Expense Categories (doughnut)
  - Monthly Cashflow (income vs expense)
- Recent Entries shows latest 10 transactions.
- Use Export CSV to download current data.
- Use Clear Data to reset all records.

## Customize Classification

Edit `categoryRules` in `app.js` and `server.js` to add your own merchants/keywords and categories.
