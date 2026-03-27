const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const xlsx = require("xlsx");

const PORT = Number(process.env.PORT) || 4100;
const DB_PATH = path.join(__dirname, "budget.db");

const app = express();
const upload = multer({ dest: path.join(__dirname, "uploads") });

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(DB_PATH);

const categoryModel = {
  income: [
    {
      name: "Income",
      subcategories: ["Paycheck/Salary", "Gambling", "Reselling", "Financial Aid", "Other Income"]
    }
  ],
  expense: [
    {
      name: "Personal Expenses",
      subcategories: ["Food", "Entertainment / Activities", "Haircut", "Soccer", "Gaming", "Shopping", "Other"]
    },
    {
      name: "Expenses",
      subcategories: ["Memberships", "Car Payments", "Insurance", "Groceries", "Investments", "Losses"]
    },
    {
      name: "Car",
      subcategories: ["Gas", "Oil Changes", "Repairs", "Tolls", "Parking", "Other"]
    },
    {
      name: "Travel",
      subcategories: ["Hotel", "Flights", "Rental", "Activities"]
    },
    {
      name: "Girlfriend",
      subcategories: ["Gifts", "Dates", "Other"]
    }
  ]
};

const classifyRules = {
  income: [
    { parentCategory: "Income", category: "Paycheck/Salary", keywords: ["paycheck", "salary", "payroll", "wage"] },
    { parentCategory: "Income", category: "Gambling", keywords: ["gamble", "bet", "casino"] },
    { parentCategory: "Income", category: "Reselling", keywords: ["resell", "sold", "marketplace", "ebay"] },
    { parentCategory: "Income", category: "Financial Aid", keywords: ["financial aid", "grant", "scholarship"] },
    { parentCategory: "Income", category: "Other Income", keywords: ["income", "bonus", "refund", "gift"] }
  ],
  expense: [
    { parentCategory: "Expenses", category: "Memberships", keywords: ["membership", "subscription", "gym"] },
    { parentCategory: "Expenses", category: "Car Payments", keywords: ["car payment", "auto loan"] },
    { parentCategory: "Expenses", category: "Insurance", keywords: ["insurance", "premium"] },
    { parentCategory: "Expenses", category: "Groceries", keywords: ["grocery", "walmart", "costco", "aldi", "target"] },
    { parentCategory: "Expenses", category: "Investments", keywords: ["investment", "broker", "stock", "crypto"] },
    { parentCategory: "Expenses", category: "Losses", keywords: ["loss", "chargeback"] },
    { parentCategory: "Car", category: "Gas", keywords: ["gas", "fuel", "shell", "chevron"] },
    { parentCategory: "Car", category: "Oil Changes", keywords: ["oil"] },
    { parentCategory: "Car", category: "Repairs", keywords: ["repair", "maintenance", "mechanic"] },
    { parentCategory: "Car", category: "Tolls", keywords: ["toll"] },
    { parentCategory: "Car", category: "Parking", keywords: ["parking", "meter"] },
    { parentCategory: "Car", category: "Other", keywords: ["car wash", "registration", "dmv"] },
    { parentCategory: "Travel", category: "Hotel", keywords: ["hotel", "airbnb"] },
    { parentCategory: "Travel", category: "Flights", keywords: ["flight", "airfare"] },
    { parentCategory: "Travel", category: "Rental", keywords: ["rental", "rent car"] },
    { parentCategory: "Travel", category: "Activities", keywords: ["activity", "tour", "ticket"] },
    { parentCategory: "Girlfriend", category: "Gifts", keywords: ["gift", "present"] },
    { parentCategory: "Girlfriend", category: "Dates", keywords: ["date", "date night"] },
    { parentCategory: "Girlfriend", category: "Other", keywords: ["gabby"] },
    { parentCategory: "Personal Expenses", category: "Entertainment / Activities", keywords: ["entertainment", "movie", "netflix", "spotify", "activity"] },
    { parentCategory: "Personal Expenses", category: "Food", keywords: ["food", "restaurant", "doordash", "ubereats", "eat"] },
    { parentCategory: "Personal Expenses", category: "Haircut", keywords: ["haircut", "barber", "salon"] },
    { parentCategory: "Personal Expenses", category: "Soccer", keywords: ["soccer", "cleats", "league"] },
    { parentCategory: "Personal Expenses", category: "Gaming", keywords: ["psn", "playstation", "gaming", "sony"] },
    { parentCategory: "Personal Expenses", category: "Shopping", keywords: ["shopping", "amazon", "mall", "clothes"] }
  ]
};

const legacyAliases = {
  WEEK: { parentCategory: "Income", category: "Paycheck/Salary" },
  GAM: { parentCategory: "Income", category: "Gambling" },
  RSL: { parentCategory: "Income", category: "Reselling" },
  FAA: { parentCategory: "Income", category: "Financial Aid" },
  OTH: { parentCategory: "Income", category: "Other Income" },
  MEM: { parentCategory: "Expenses", category: "Memberships" },
  VAC: { parentCategory: "Travel", category: "Hotel" },
  INV: { parentCategory: "Expenses", category: "Investments" },
  LSS: { parentCategory: "Expenses", category: "Losses" },
  GAS: { parentCategory: "Car", category: "Gas" },
  INS: { parentCategory: "Expenses", category: "Insurance" },
  OIL: { parentCategory: "Car", category: "Oil Changes" },
  TOL: { parentCategory: "Car", category: "Tolls" },
  PAR: { parentCategory: "Car", category: "Parking" },
  OTH2: { parentCategory: "Car", category: "Other" },
  GIFT: { parentCategory: "Girlfriend", category: "Gifts" },
  DATE: { parentCategory: "Girlfriend", category: "Dates" },
  OTH3: { parentCategory: "Girlfriend", category: "Other" },
  ENT: { parentCategory: "Personal Expenses", category: "Entertainment / Activities" },
  FOOD: { parentCategory: "Personal Expenses", category: "Food" },
  CUT: { parentCategory: "Personal Expenses", category: "Haircut" },
  GROC: { parentCategory: "Expenses", category: "Groceries" },
  SOCC: { parentCategory: "Personal Expenses", category: "Soccer" },
  PSN: { parentCategory: "Personal Expenses", category: "Gaming" },
  SHOP: { parentCategory: "Personal Expenses", category: "Shopping" },
  OTH4: { parentCategory: "Personal Expenses", category: "Other" },
  CAR: { parentCategory: "Expenses", category: "Car Payments" },
  SALARY: { parentCategory: "Income", category: "Paycheck/Salary" },
  "OTHER INCOME": { parentCategory: "Income", category: "Other Income" },
  "OTHER EXPENSE": { parentCategory: "Expenses", category: "Losses" }
};

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      parent_category TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.run("ALTER TABLE transactions ADD COLUMN parent_category TEXT", () => {});
});

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

function normalizeAmount(value) {
  if (typeof value === "number") {
    return value;
  }

  const raw = String(value || "").trim();
  if (!raw) {
    return Number.NaN;
  }

  const cleaned = raw
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\((.*)\)/, "-$1");

  return Number(cleaned);
}

function normalizeDate(value) {
  const formatDateParts = (year, month, day) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (typeof value === "string") {
    const rawString = value.trim();
    const isoMatch = rawString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return formatDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const slashMatch = rawString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      return formatDateParts(Number(slashMatch[3]), Number(slashMatch[1]), Number(slashMatch[2]));
    }
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number") {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) {
      return formatDateParts(parsed.y, parsed.m, parsed.d);
    }
  }

  const raw = String(value || "").trim();
  if (!raw) {
    const today = new Date();
    return formatDateParts(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  const candidate = new Date(raw);
  if (!Number.isNaN(candidate.valueOf())) {
    return formatDateParts(candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate());
  }

  const today = new Date();
  return formatDateParts(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function classifyCategory(description, type) {
  const lower = String(description || "").toLowerCase();
  const rules = classifyRules[type] || [];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return { parentCategory: rule.parentCategory, category: rule.category };
    }
  }

  return type === "income"
    ? { parentCategory: "Income", category: "Other Income" }
    : { parentCategory: "Personal Expenses", category: "Other" };
}

function normalizeCategory({ value, parentCategory, type, description }) {
  const rawCategory = String(value || "").trim();
  const rawParent = String(parentCategory || "").trim();
  const groups = categoryModel[type] || [];

  if (rawCategory) {
    const alias = legacyAliases[rawCategory.toUpperCase()];
    if (alias) {
      return alias;
    }

    for (const group of groups) {
      if (group.subcategories.some((subcategory) => subcategory.toLowerCase() === rawCategory.toLowerCase())) {
        return { parentCategory: group.name, category: group.subcategories.find((subcategory) => subcategory.toLowerCase() === rawCategory.toLowerCase()) };
      }
    }
  }

  if (rawCategory && rawParent) {
    const parentMatch = groups.find((group) => group.name.toLowerCase() === rawParent.toLowerCase());
    if (parentMatch) {
      const sub = parentMatch.subcategories.find((subcategory) => subcategory.toLowerCase() === rawCategory.toLowerCase());
      if (sub) {
        return { parentCategory: parentMatch.name, category: sub };
      }
    }
  }

  return classifyCategory(description, type);
}

function findHeader(headers, patterns) {
  return headers.find((header) => patterns.some((pattern) => pattern.test(header)));
}

function toTransaction(row, mapping) {
  const description = String(row[mapping.description] || "").trim();
  const amountRaw = normalizeAmount(row[mapping.amount]);
  if (!description || Number.isNaN(amountRaw) || amountRaw === 0) {
    return null;
  }

  const typeRaw = String(row[mapping.type] || "").trim().toLowerCase();
  const type = typeRaw === "income" || typeRaw === "expense"
    ? typeRaw
    : amountRaw < 0
      ? "expense"
      : "income";

  const normalized = normalizeCategory({
    value: row[mapping.category],
    parentCategory: row[mapping.parentCategory],
    type,
    description
  });

  return {
    id: crypto.randomUUID(),
    date: normalizeDate(row[mapping.date]),
    description,
    parentCategory: normalized.parentCategory,
    category: normalized.category,
    type,
    amount: Math.abs(amountRaw),
    createdAt: Date.now()
  };
}

app.get("/api/transactions", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, date, description, COALESCE(parent_category, '') AS parentCategory, category, type, amount, created_at AS createdAt
       FROM transactions
       ORDER BY created_at DESC`
    );

    const normalizedRows = rows.map((row) => {
      const normalized = normalizeCategory({
        value: row.category,
        parentCategory: row.parentCategory,
        type: row.type,
        description: row.description
      });

      return {
        ...row,
        parentCategory: normalized.parentCategory,
        category: normalized.category
      };
    });

    res.json(normalizedRows);
  } catch {
    res.status(500).json({ error: "Failed To Load Transactions" });
  }
});

app.post("/api/transactions", async (req, res) => {
  const { description, amount, type, date, category, parentCategory } = req.body || {};
  const cleanDescription = String(description || "").trim();
  const cleanType = type === "income" ? "income" : "expense";
  const cleanAmount = Number(amount);
  const cleanDate = normalizeDate(date);

  if (!cleanDescription || Number.isNaN(cleanAmount) || cleanAmount <= 0) {
    res.status(400).json({ error: "Invalid Transaction Payload" });
    return;
  }

  const normalized = normalizeCategory({ value: category, parentCategory, type: cleanType, description: cleanDescription });

  const tx = {
    id: crypto.randomUUID(),
    date: cleanDate,
    description: cleanDescription,
    parentCategory: normalized.parentCategory,
    category: normalized.category,
    type: cleanType,
    amount: cleanAmount,
    createdAt: Date.now()
  };

  try {
    await dbRun(
      `INSERT INTO transactions (id, date, description, parent_category, category, type, amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tx.id, tx.date, tx.description, tx.parentCategory, tx.category, tx.type, tx.amount, tx.createdAt]
    );

    res.status(201).json(tx);
  } catch {
    res.status(500).json({ error: "Failed To Save Transaction" });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const { description, amount, type, date, category, parentCategory } = req.body || {};

  const cleanDescription = String(description || "").trim();
  const cleanType = type === "income" ? "income" : "expense";
  const cleanAmount = Number(amount);
  const cleanDate = normalizeDate(date);

  if (!id || !cleanDescription || Number.isNaN(cleanAmount) || cleanAmount <= 0) {
    res.status(400).json({ error: "Invalid Transaction Payload" });
    return;
  }

  const normalized = normalizeCategory({ value: category, parentCategory, type: cleanType, description: cleanDescription });

  try {
    const result = await dbRun(
      `UPDATE transactions
       SET date = ?, description = ?, parent_category = ?, category = ?, type = ?, amount = ?
       WHERE id = ?`,
      [cleanDate, cleanDescription, normalized.parentCategory, normalized.category, cleanType, cleanAmount, id]
    );

    if (!result.changes) {
      res.status(404).json({ error: "Transaction Not Found" });
      return;
    }

    const rows = await dbAll(
      `SELECT id, date, description, COALESCE(parent_category, '') AS parentCategory, category, type, amount, created_at AS createdAt
       FROM transactions
       WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed To Update Transaction" });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const result = await dbRun("DELETE FROM transactions WHERE id = ?", [req.params.id]);
    if (!result.changes) {
      res.status(404).json({ error: "Transaction Not Found" });
      return;
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed To Delete Transaction" });
  }
});

app.delete("/api/transactions", async (req, res) => {
  try {
    await dbRun("DELETE FROM transactions");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed To Clear Data" });
  }
});

app.post("/api/import-excel", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No File Uploaded" });
    return;
  }

  let importedCount = 0;
  let skippedCount = 0;

  try {
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      res.status(400).json({ error: "Excel Sheet Is Empty" });
      return;
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) {
      res.status(400).json({ error: "No Rows Found In Excel" });
      return;
    }

    const headers = Object.keys(rows[0]);
    const mapping = {
      date: findHeader(headers, [/^date$/i, /transaction\s*date/i, /posted/i]) || "",
      description: findHeader(headers, [/description/i, /merchant/i, /details/i, /memo/i, /name/i]) || "",
      amount: findHeader(headers, [/^amount$/i, /value/i, /total/i, /cost/i]) || "",
      type: findHeader(headers, [/^type$/i, /income|expense/i]) || "",
      parentCategory: findHeader(headers, [/parent/i, /main\s*category/i]) || "",
      category: findHeader(headers, [/^category$/i, /subcategory/i, /group/i, /class/i]) || ""
    };

    if (!mapping.description || !mapping.amount) {
      res.status(400).json({ error: "Could Not Detect Description/Amount Columns" });
      return;
    }

    await dbRun("BEGIN TRANSACTION");

    for (const row of rows) {
      const tx = toTransaction(row, mapping);
      if (!tx) {
        skippedCount += 1;
        continue;
      }

      await dbRun(
        `INSERT INTO transactions (id, date, description, parent_category, category, type, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.date, tx.description, tx.parentCategory, tx.category, tx.type, tx.amount, tx.createdAt]
      );

      importedCount += 1;
    }

    await dbRun("COMMIT");
    res.json({ importedCount, skippedCount });
  } catch {
    await dbRun("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "Failed To Import Excel File" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

app.get("/api/export-excel", async (req, res) => {
  try {
    const transactions = await dbAll(
      `SELECT date, description, COALESCE(parent_category, '') AS parentCategory, category, type, amount
       FROM transactions
       ORDER BY date ASC, parent_category ASC, type DESC`
    );

    if (!transactions.length) {
      res.status(400).json({ error: "No Transactions To Export" });
      return;
    }

    // Group transactions by month, then by category
    const monthlyData = {};
    const allMonths = [];

    transactions.forEach((tx) => {
      const monthKey = tx.date.substring(0, 7); // YYYY-MM format
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
        allMonths.push(monthKey);
      }

      const catKey = tx.parentCategory || "Uncategorized";
      if (!monthlyData[monthKey][catKey]) {
        monthlyData[monthKey][catKey] = [];
      }

      monthlyData[monthKey][catKey].push(tx);
    });

    // Create workbook with multiple sheets
    const workbook = xlsx.utils.book_new();

    // Add summary sheet with monthly breakdown
    const summaryData = [];
    summaryData.push(["Budget Pulse - Export Summary"]);
    summaryData.push([]);
    summaryData.push(["Export Date", new Date().toLocaleDateString()]);
    summaryData.push(["Total Transactions", transactions.length]);
    summaryData.push([]);
    summaryData.push(["Monthly Totals"]);
    summaryData.push(["Month", "Income", "Expenses", "Net"]);

    let overallIncome = 0;
    let overallExpenses = 0;

    allMonths.sort().forEach((month) => {
      const monthTxs = Object.values(monthlyData[month]).flat();
      const monthIncome = monthTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const monthExpenses = monthTxs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const monthNet = monthIncome - monthExpenses;

      overallIncome += monthIncome;
      overallExpenses += monthExpenses;

      // Format month nicely (2026-03 -> March 2026)
      const [year, monthNum] = month.split("-");
      const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString("default", { month: "long", year: "numeric" });

      summaryData.push([
        monthName,
        monthIncome.toFixed(2),
        monthExpenses.toFixed(2),
        monthNet.toFixed(2)
      ]);
    });

    summaryData.push([]);
    summaryData.push(["OVERALL TOTALS", overallIncome.toFixed(2), overallExpenses.toFixed(2), (overallIncome - overallExpenses).toFixed(2)]);

    const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    xlsx.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Add sheet for each month
    allMonths.sort().forEach((month) => {
      const monthTxs = monthlyData[month];
      const sheetData = [];

      // Format month nicely
      const [year, monthNum] = month.split("-");
      const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString("default", { month: "long", year: "numeric" });

      sheetData.push([monthName]);
      sheetData.push([]);

      let monthIncome = 0;
      let monthExpenses = 0;

      // Add each category section - Income first, then alphabetical
      const sortedCategories = Object.keys(monthTxs).sort((a, b) => {
        if (a === "Income") return -1;
        if (b === "Income") return 1;
        return a.localeCompare(b);
      });

      sortedCategories.forEach((category, idx) => {
        if (idx > 0) {
          sheetData.push([]); // blank row between categories
        }

        sheetData.push([category]); // Category header
        sheetData.push(["Date", "Description", "Type", "Subcategory", "Amount"]);

        const categoryTxs = monthTxs[category];

        categoryTxs.forEach((tx) => {
          sheetData.push([
            tx.date,
            tx.description,
            tx.type,
            tx.category,
            Number(tx.amount).toFixed(2)
          ]);

          if (tx.type === "income") {
            monthIncome += tx.amount;
          } else {
            monthExpenses += tx.amount;
          }
        });

        // Category totals
        const catIncome = categoryTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const catExpenses = categoryTxs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

        sheetData.push([]);
        sheetData.push(["", "", "CATEGORY TOTAL", "", ""]);
        if (catIncome > 0) {
          sheetData.push(["", "", "Income", "", catIncome.toFixed(2)]);
        }
        if (catExpenses > 0) {
          sheetData.push(["", "", "Expenses", "", catExpenses.toFixed(2)]);
        }
      });

      // Month totals
      sheetData.push([]);
      sheetData.push([]);
      sheetData.push(["", "", "MONTH TOTAL", "", ""]);
      sheetData.push(["", "", "Income", "", monthIncome.toFixed(2)]);
      sheetData.push(["", "", "Expenses", "", monthExpenses.toFixed(2)]);
      sheetData.push(["", "", "Net", "", (monthIncome - monthExpenses).toFixed(2)]);

      const sheet = xlsx.utils.aoa_to_sheet(sheetData);
      sheet["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 25 }, { wch: 12 }];

      // Format category headers (bold with background)
      const range = xlsx.utils.decode_range(sheet["!ref"] || "A1");
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = xlsx.utils.encode_cell({ r: R, c: C });
          if (!sheet[address]) continue;

          const cellValue = sheet[address].v;

          // Format category headers (first column entries that are not in the totals/transaction data)
          if (C === 0 && typeof cellValue === "string" && 
              cellValue !== "Date" && 
              cellValue !== monthName &&
              !cellValue.includes("MONTH") &&
              !cellValue.includes("CATEGORY") &&
              !cellValue.includes("Income") &&
              !cellValue.includes("Expenses") &&
              !cellValue.includes("Net")) {
            sheet[address].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4472C4" } },
              alignment: { horizontal: "left", vertical: "center" }
            };
          }

          // Format column headers (Date, Description, etc.)
          if (R > 0 && cellValue === "Date") {
            // Find the row with headers and format all of them
            for (let HC = range.s.c; HC <= range.e.c; ++HC) {
              const headerAddr = xlsx.utils.encode_cell({ r: R, c: HC });
              if (sheet[headerAddr]) {
                sheet[headerAddr].s = {
                  font: { bold: true, color: { rgb: "FFFFFF" } },
                  fill: { fgColor: { rgb: "366092" } },
                  alignment: { horizontal: "center", vertical: "center" }
                };
              }
            }
          }
        }
      }

      // Use friendly month name for sheet, truncated to 31 chars if needed
      const sheetName = monthName.substring(0, 31);
      xlsx.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    // Generate file
    const fileBuffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="budget-pulse-export.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(fileBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed To Export Transactions" });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Budget Dashboard Running On http://localhost:${PORT}`);
});
