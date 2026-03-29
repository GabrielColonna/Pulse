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
const IMPORT_PREVIEW_TTL_MS = 30 * 60 * 1000;
const importPreviewCache = new Map();

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(DB_PATH);

const categoryModel = {
  income: [
    {
      name: "Income",
      subcategories: ["Salary", "Gambling", "Reselling", "Financial Aid", "Other Income"]
    }
  ],
  expense: [
    {
      name: "Personal",
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
    {
      parentCategory: "Income",
      category: "Salary",
      keywords: ["paycheck", "salary"]
    },
    {
      parentCategory: "Income",
      category: "Gambling",
      keywords: ["gamble", "casino", "fliff", "underdog", "hard rock", "prize picks", "prizepicks"]
    },
    {
      parentCategory: "Income",
      category: "Reselling",
      keywords: ["resell", "marketplace", "ebay", "jersey", "stockx"]
    },
    {
      parentCategory: "Income",
      category: "Financial Aid",
      keywords: ["financial aid", "grant", "scholarship", "fafsa"]
    },
    {
      parentCategory: "Income",
      category: "Other Income",
      keywords: ["bonus", "refund", "reimbursement", "cashback"]
    }
  ],
  expense: [
    {
      parentCategory: "Expenses",
      category: "Memberships",
      keywords: ["membership", "subscription", "gym", "icloud", "planet fitness", "coursera", "microsoft 365", "pf monthly", "annual fee"]
    },
    {
      parentCategory: "Expenses",
      category: "Car Payments",
      keywords: ["car payment", "auto loan", "pay off car"]
    },
    {
      parentCategory: "Expenses",
      category: "Insurance",
      keywords: ["insurance", "geico"]
    },
    {
      parentCategory: "Expenses",
      category: "Groceries",
      keywords: ["grocery", "walmart", "costco", "aldi", "target", "publix", "trader joe", "walgreens", "xeela"]
    },
    {
      parentCategory: "Expenses",
      category: "Investments",
      keywords: ["investment", "stock", "crypto", "savings", "wealthfront", "xrp"]
    },
    {
      parentCategory: "Expenses",
      category: "Losses",
      keywords: ["loss", "chargeback", "doctor", "copay", "parking ticket", "parking citation"]
    },
    {
      parentCategory: "Car",
      category: "Gas",
      keywords: ["gas", "fuel", "shell", "chevron"]
    },
    {
      parentCategory: "Car",
      category: "Oil Changes",
      keywords: ["oil change", "tire kingdom"]
    },
    {
      parentCategory: "Car",
      category: "Repairs",
      keywords: ["repair", "maintenance", "mechanic", "car tow", "tow", "brake", "registration renewal"]
    },
    {
      parentCategory: "Car",
      category: "Tolls",
      keywords: ["toll", "tolls"]
    },
    {
      parentCategory: "Car",
      category: "Parking",
      keywords: ["parking"]
    },
    {
      parentCategory: "Car",
      category: "Other",
      keywords: ["registration", "dmv"]
    },
    {
      parentCategory: "Travel",
      category: "Hotel",
      keywords: ["hotel", "airbnb", "bnb", "hostel"]
    },
    {
      parentCategory: "Travel",
      category: "Flights",
      keywords: ["flight", "airfare", "spirit", "checked bag", "seatbid", "flight to", "san fran flights"]
    },
    {
      parentCategory: "Travel",
      category: "Rental",
      keywords: ["rental", "rent car", "car rental"]
    },
    {
      parentCategory: "Travel",
      category: "Activities",
      keywords: ["activity"]
    },
    {
      parentCategory: "Girlfriend",
      category: "Gifts",
      keywords: ["flowers", "vday", "valentines"]
    },
    {
      parentCategory: "Girlfriend",
      category: "Dates",
      keywords: ["date night", "olive garden", "divieto", "north italia", "wood one ramen"]
    },
    {
      parentCategory: "Girlfriend",
      category: "Other",
      keywords: ["gabby", "publix stuff"]
    },
    {
      parentCategory: "Personal",
      category: "Entertainment / Activities",
      keywords: ["entertainment", "movie", "netflix", "spotify", "amc", "top golf", "miami heat",  "poker", "tequila", "drinks", "heat tickets"]
    },
    {
      parentCategory: "Personal",
      category: "Food",
      keywords: ["doordash", "ubereats", "chipotle", "cfa", "shake shack", "mcd", "mcdonalds", "flanigans", "pubsub", "burger king", "bk", "rcg vending"]
    },
    {
      parentCategory: "Personal",
      category: "Haircut",
      keywords: ["haircut", "barber", "salon"]
    },
    {
      parentCategory: "Personal",
      category: "Soccer",
      keywords: ["soccer", "stadio", "fut5ive", "futbol", "la redonda", "ags"]
    },
    {
      parentCategory: "Personal",
      category: "Gaming",
      keywords: ["psn", "playstation", "gaming", "sony", "marvel rivals", "nba2k", "steam"]
    },
    {
      parentCategory: "Personal",
      category: "Shopping",
      keywords: ["shopping", "amazon", "clothes", "amz", "zara", "souvenir"]
    },
    {
      parentCategory: "Personal",
      category: "Other",
      keywords: ["other", "misc"]
    }
  ]
};

const legacyAliases = {
  "PAYCHECK/SALARY": { parentCategory: "Income", category: "Salary" },
  WEEK: { parentCategory: "Income", category: "Salary" },
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
  ENT: { parentCategory: "Personal", category: "Entertainment / Activities" },
  FOOD: { parentCategory: "Personal", category: "Food" },
  CUT: { parentCategory: "Personal", category: "Haircut" },
  GROC: { parentCategory: "Expenses", category: "Groceries" },
  SOCC: { parentCategory: "Personal", category: "Soccer" },
  PSN: { parentCategory: "Personal", category: "Gaming" },
  SHOP: { parentCategory: "Personal", category: "Shopping" },
  OTH4: { parentCategory: "Personal", category: "Other" },
  CAR: { parentCategory: "Expenses", category: "Car Payments" },
  SALARY: { parentCategory: "Income", category: "Salary" },
  "OTHER INCOME": { parentCategory: "Income", category: "Other Income" },
  "OTHER EXPENSE": { parentCategory: "Expenses", category: "Losses" }
};

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      start_date TEXT,
      end_date TEXT,
      created_at INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      parent_category TEXT,
      trip_id TEXT,
      category TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  db.run("ALTER TABLE transactions ADD COLUMN parent_category TEXT", () => {});
  db.run("ALTER TABLE transactions ADD COLUMN trip_id TEXT", () => {});

  // Keep historical data consistent with current category naming.
  db.run("UPDATE transactions SET category = 'Salary' WHERE category = 'Paycheck/Salary'");
  db.run("UPDATE transactions SET parent_category = 'Personal' WHERE parent_category = 'Personal Expenses'");
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

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

async function resolveTripId(rawTripId) {
  const cleanTripId = String(rawTripId || "").trim();
  if (!cleanTripId) {
    return "";
  }

  const trip = await dbGet("SELECT id FROM trips WHERE id = ? AND archived = 0", [cleanTripId]);
  if (!trip) {
    const error = new Error("Trip Not Found");
    error.code = "TRIP_NOT_FOUND";
    throw error;
  }

  return trip.id;
}

async function findOrCreateTripByName(rawName) {
  const cleanName = String(rawName || "").trim();
  if (!cleanName) {
    return "";
  }

  const existing = await dbGet("SELECT id FROM trips WHERE lower(name) = lower(?) AND archived = 0", [cleanName]);
  if (existing?.id) {
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO trips (id, name, start_date, end_date, created_at, archived)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [id, cleanName, "", "", Date.now()]
  );

  return id;
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

function addDays(dateStr, days) {
  const date = new Date(`${String(dateStr || "").slice(0, 10)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return normalizeDate(date);
}

function addMonths(dateStr, monthsToAdd) {
  const base = new Date(`${String(dateStr || "").slice(0, 10)}T00:00:00`);
  const originalDay = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return normalizeDate(target);
}

function shiftDateByFrequency(dateStr, frequency, occurrenceIndex) {
  if (occurrenceIndex <= 0 || frequency === "none") {
    return normalizeDate(dateStr);
  }

  if (frequency === "weekly") {
    return addDays(dateStr, 7 * occurrenceIndex);
  }

  if (frequency === "biweekly") {
    return addDays(dateStr, 14 * occurrenceIndex);
  }

  if (frequency === "monthly") {
    return addMonths(dateStr, occurrenceIndex);
  }

  return normalizeDate(dateStr);
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
    : { parentCategory: "Personal", category: "Other" };
}

function normalizeCategory({ value, parentCategory, type, description }) {
  const rawCategory = String(value || "").trim();
  const rawParent = String(parentCategory || "").trim();
  const normalizedParent = rawParent.toLowerCase() === "personal expenses" ? "Personal" : rawParent;
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

  if (rawCategory && normalizedParent) {
    const parentMatch = groups.find((group) => group.name.toLowerCase() === normalizedParent.toLowerCase());
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

function purgeExpiredImportPreviews() {
  const now = Date.now();
  for (const [token, item] of importPreviewCache.entries()) {
    if (!item?.createdAt || now - item.createdAt > IMPORT_PREVIEW_TTL_MS) {
      importPreviewCache.delete(token);
    }
  }
}

function buildImportMapping(headers, overrides = {}) {
  const nextMapping = {
    date: findHeader(headers, [/^date$/i, /transaction\s*date/i, /posted/i]) || "",
    description: findHeader(headers, [/description/i, /merchant/i, /details/i, /memo/i, /name/i]) || "",
    amount: findHeader(headers, [/^amount$/i, /value/i, /total/i, /cost/i]) || "",
    type: findHeader(headers, [/^type$/i, /income|expense/i]) || "",
    parentCategory: findHeader(headers, [/parent/i, /main\s*category/i]) || "",
    category: findHeader(headers, [/^category$/i, /subcategory/i, /group/i, /class/i]) || "",
    trip: findHeader(headers, [/^trip$/i, /trip\s*name/i]) || ""
  };

  const keys = ["date", "description", "amount", "type", "parentCategory", "category", "trip"];
  for (const key of keys) {
    const overrideValue = String(overrides?.[key] || "").trim();
    if (!overrideValue) {
      continue;
    }

    nextMapping[key] = headers.includes(overrideValue) ? overrideValue : "";
  }

  return nextMapping;
}

function getImportRowCell(row, headerName) {
  if (!headerName) {
    return "";
  }

  return row[headerName];
}

function parseImportRow(row, mapping, rowNumber) {
  const description = String(getImportRowCell(row, mapping.description) || "").trim();
  const amountRaw = normalizeAmount(getImportRowCell(row, mapping.amount));

  if (!description) {
    return { ok: false, reason: "Missing Description", rowNumber };
  }

  if (Number.isNaN(amountRaw) || amountRaw === 0) {
    return { ok: false, reason: "Invalid Amount", rowNumber };
  }

  const typeRaw = String(getImportRowCell(row, mapping.type) || "").trim().toLowerCase();
  const type = typeRaw === "income" || typeRaw === "expense"
    ? typeRaw
    : amountRaw < 0
      ? "expense"
      : "income";

  const normalized = normalizeCategory({
    value: getImportRowCell(row, mapping.category),
    parentCategory: getImportRowCell(row, mapping.parentCategory),
    type,
    description
  });

  return {
    ok: true,
    tx: {
      rowNumber,
      date: normalizeDate(getImportRowCell(row, mapping.date)),
      description,
      parentCategory: normalized.parentCategory,
      category: normalized.category,
      tripName: String(getImportRowCell(row, mapping.trip) || "").trim(),
      type,
      amount: Math.abs(amountRaw)
    }
  };
}

function buildDuplicateKey(tx) {
  const amount = Number(tx.amount || 0).toFixed(2);
  const normalizedDescription = String(tx.description || "").trim().toLowerCase();
  return `${normalizeDate(tx.date)}|${normalizedDescription}|${tx.type}|${amount}`;
}

async function getExistingDuplicateKeys() {
  const rows = await dbAll("SELECT date, description, type, amount FROM transactions");
  return new Set(rows.map((row) => buildDuplicateKey(row)));
}

function buildImportPreview(rows, mapping, existingDuplicateKeys) {
  const validTransactions = [];
  const previewRows = [];
  const duplicateCounts = {
    existing: 0,
    file: 0
  };
  const batchDuplicateKeys = new Set();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const parsed = parseImportRow(row, mapping, rowNumber);

    if (!parsed.ok) {
      previewRows.push({
        rowNumber,
        description: String(getImportRowCell(row, mapping.description) || "").trim(),
        type: "",
        amount: "",
        status: "invalid",
        reason: parsed.reason
      });
      return;
    }

    const duplicateKey = buildDuplicateKey(parsed.tx);
    let status = "ready";
    let reason = "";

    if (existingDuplicateKeys.has(duplicateKey)) {
      status = "duplicate-existing";
      reason = "Matches Existing Transaction";
      duplicateCounts.existing += 1;
    } else if (batchDuplicateKeys.has(duplicateKey)) {
      status = "duplicate-file";
      reason = "Duplicate Within File";
      duplicateCounts.file += 1;
    }

    batchDuplicateKeys.add(duplicateKey);
    validTransactions.push(parsed.tx);
    previewRows.push({
      rowNumber,
      date: parsed.tx.date,
      description: parsed.tx.description,
      type: parsed.tx.type,
      parentCategory: parsed.tx.parentCategory,
      category: parsed.tx.category,
      tripName: parsed.tx.tripName,
      amount: parsed.tx.amount,
      status,
      reason
    });
  });

  return {
    validTransactions,
    previewRows,
    invalidCount: previewRows.filter((row) => row.status === "invalid").length,
    duplicateExistingCount: duplicateCounts.existing,
    duplicateFileCount: duplicateCounts.file
  };
}

function toTransaction(row, mapping) {
  const parsed = parseImportRow(row, mapping, 0);
  if (!parsed.ok) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    date: parsed.tx.date,
    description: parsed.tx.description,
    parentCategory: parsed.tx.parentCategory,
    category: parsed.tx.category,
    tripName: parsed.tx.tripName,
    type: parsed.tx.type,
    amount: parsed.tx.amount,
    createdAt: Date.now()
  };
}

app.get("/api/trips", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, name, COALESCE(start_date, '') AS startDate, COALESCE(end_date, '') AS endDate, archived, created_at AS createdAt
       FROM trips
       WHERE archived = 0
       ORDER BY name COLLATE NOCASE ASC`
    );

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed To Load Trips" });
  }
});

app.post("/api/trips", async (req, res) => {
  const cleanName = String(req.body?.name || "").trim();
  if (!cleanName) {
    res.status(400).json({ error: "Trip Name Is Required" });
    return;
  }

  try {
    const existing = await dbGet("SELECT id, name, COALESCE(start_date, '') AS startDate, COALESCE(end_date, '') AS endDate, archived, created_at AS createdAt FROM trips WHERE lower(name) = lower(?) AND archived = 0", [cleanName]);
    if (existing) {
      res.json(existing);
      return;
    }

    const trip = {
      id: crypto.randomUUID(),
      name: cleanName,
      startDate: "",
      endDate: "",
      archived: 0,
      createdAt: Date.now()
    };

    await dbRun(
      `INSERT INTO trips (id, name, start_date, end_date, created_at, archived)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [trip.id, trip.name, trip.startDate, trip.endDate, trip.createdAt, trip.archived]
    );

    res.status(201).json(trip);
  } catch {
    res.status(500).json({ error: "Failed To Create Trip" });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT id, date, description, COALESCE(parent_category, '') AS parentCategory, COALESCE(trip_id, '') AS tripId, category, type, amount, created_at AS createdAt
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
  const { description, amount, type, date, category, parentCategory, tripId, recurrenceFrequency, recurrenceCount } = req.body || {};
  const cleanDescription = String(description || "").trim();
  const cleanType = type === "income" ? "income" : "expense";
  const cleanAmount = Number(amount);
  const cleanDate = normalizeDate(date);
  const cleanFrequency = ["none", "monthly", "weekly", "biweekly"].includes(String(recurrenceFrequency || "none"))
    ? String(recurrenceFrequency || "none")
    : "none";
  const parsedCount = Number(recurrenceCount);
  const cleanRecurrenceCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : 1;

  if (!cleanDescription || Number.isNaN(cleanAmount) || cleanAmount <= 0) {
    res.status(400).json({ error: "Invalid Transaction Payload" });
    return;
  }

  if (cleanRecurrenceCount > 36) {
    res.status(400).json({ error: "Number Of Recurring Entries Cannot Exceed 36" });
    return;
  }

  if (cleanFrequency === "none" && cleanRecurrenceCount > 1) {
    res.status(400).json({ error: "Frequency Must Be Set For Multiple Entries" });
    return;
  }

  const normalized = normalizeCategory({ value: category, parentCategory, type: cleanType, description: cleanDescription });

  try {
    const cleanTripId = await resolveTripId(tripId);

    const entriesToCreate = cleanFrequency === "none" ? 1 : cleanRecurrenceCount;
    const created = [];

    await dbRun("BEGIN TRANSACTION");

    for (let i = 0; i < entriesToCreate; i += 1) {
      const tx = {
        id: crypto.randomUUID(),
        date: shiftDateByFrequency(cleanDate, cleanFrequency, i),
        description: cleanDescription,
        parentCategory: normalized.parentCategory,
        tripId: cleanTripId,
        category: normalized.category,
        type: cleanType,
        amount: cleanAmount,
        createdAt: Date.now() + i
      };

      await dbRun(
        `INSERT INTO transactions (id, date, description, parent_category, trip_id, category, type, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.date, tx.description, tx.parentCategory, tx.tripId, tx.category, tx.type, tx.amount, tx.createdAt]
      );

      created.push(tx);
    }

    await dbRun("COMMIT");

    if (created.length === 1) {
      res.status(201).json(created[0]);
      return;
    }

    res.status(201).json({ created });
  } catch (error) {
    await dbRun("ROLLBACK").catch(() => {});
    if (error?.code === "TRIP_NOT_FOUND") {
      res.status(400).json({ error: "Selected Trip Does Not Exist" });
      return;
    }
    res.status(500).json({ error: "Failed To Save Transaction" });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const { description, amount, type, date, category, parentCategory, tripId } = req.body || {};

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
    const cleanTripId = await resolveTripId(tripId);

    const result = await dbRun(
      `UPDATE transactions
       SET date = ?, description = ?, parent_category = ?, trip_id = ?, category = ?, type = ?, amount = ?
       WHERE id = ?`,
      [cleanDate, cleanDescription, normalized.parentCategory, cleanTripId, normalized.category, cleanType, cleanAmount, id]
    );

    if (!result.changes) {
      res.status(404).json({ error: "Transaction Not Found" });
      return;
    }

    const rows = await dbAll(
      `SELECT id, date, description, COALESCE(parent_category, '') AS parentCategory, COALESCE(trip_id, '') AS tripId, category, type, amount, created_at AS createdAt
       FROM transactions
       WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    if (error?.code === "TRIP_NOT_FOUND") {
      res.status(400).json({ error: "Selected Trip Does Not Exist" });
      return;
    }
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
    const mapping = buildImportMapping(headers);

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

      const cleanTripId = tx.tripName ? await findOrCreateTripByName(tx.tripName) : "";

      await dbRun(
        `INSERT INTO transactions (id, date, description, parent_category, trip_id, category, type, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tx.id, tx.date, tx.description, tx.parentCategory, cleanTripId, tx.category, tx.type, tx.amount, tx.createdAt]
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

app.post("/api/import-preview", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No File Uploaded" });
    return;
  }

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
    const mapping = buildImportMapping(headers);

    if (!mapping.description || !mapping.amount) {
      res.status(400).json({ error: "Could Not Detect Description/Amount Columns" });
      return;
    }

    const existingDuplicateKeys = await getExistingDuplicateKeys();
    const preview = buildImportPreview(rows, mapping, existingDuplicateKeys);
    const token = crypto.randomUUID();

    purgeExpiredImportPreviews();
    importPreviewCache.set(token, {
      createdAt: Date.now(),
      rows,
      headers,
      fileName: req.file.originalname || ""
    });

    res.json({
      token,
      fileName: req.file.originalname || "",
      headers,
      mapping,
      summary: {
        totalRows: rows.length,
        readyRows: preview.previewRows.filter((row) => row.status === "ready").length,
        invalidRows: preview.invalidCount,
        duplicateExistingRows: preview.duplicateExistingCount,
        duplicateFileRows: preview.duplicateFileCount
      },
      previewRows: preview.previewRows.slice(0, 150)
    });
  } catch {
    res.status(500).json({ error: "Failed To Build Import Preview" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

app.post("/api/import-commit", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "Missing Import Token" });
    return;
  }

  purgeExpiredImportPreviews();
  const cachedPreview = importPreviewCache.get(token);
  if (!cachedPreview) {
    res.status(410).json({ error: "Import Preview Expired. Please Upload Again." });
    return;
  }

  const mapping = buildImportMapping(cachedPreview.headers, req.body?.mapping || {});
  if (!mapping.description || !mapping.amount) {
    res.status(400).json({ error: "Description And Amount Mappings Are Required" });
    return;
  }

  const skipDuplicates = req.body?.skipDuplicates !== false;

  try {
    const existingDuplicateKeys = skipDuplicates ? await getExistingDuplicateKeys() : new Set();
    const preview = buildImportPreview(cachedPreview.rows, mapping, existingDuplicateKeys);
    const batchDuplicateKeys = new Set();

    let importedCount = 0;
    let skippedCount = preview.invalidCount;
    let skippedDuplicateCount = 0;

    await dbRun("BEGIN TRANSACTION");

    for (const tx of preview.validTransactions) {
      const duplicateKey = buildDuplicateKey(tx);
      if (skipDuplicates && (existingDuplicateKeys.has(duplicateKey) || batchDuplicateKeys.has(duplicateKey))) {
        skippedCount += 1;
        skippedDuplicateCount += 1;
        continue;
      }

      const cleanTripId = tx.tripName ? await findOrCreateTripByName(tx.tripName) : "";
      const createdAt = Date.now() + importedCount;

      await dbRun(
        `INSERT INTO transactions (id, date, description, parent_category, trip_id, category, type, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), tx.date, tx.description, tx.parentCategory, cleanTripId, tx.category, tx.type, tx.amount, createdAt]
      );

      importedCount += 1;
      batchDuplicateKeys.add(duplicateKey);
      existingDuplicateKeys.add(duplicateKey);
    }

    await dbRun("COMMIT");
    importPreviewCache.delete(token);

    res.json({
      importedCount,
      skippedCount,
      skippedDuplicateCount,
      invalidCount: preview.invalidCount
    });
  } catch {
    await dbRun("ROLLBACK").catch(() => {});
    res.status(500).json({ error: "Failed To Commit Import" });
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

app.get("/api/export-backup-csv", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT t.date, t.description, COALESCE(t.parent_category, '') AS parentCategory, COALESCE(t.trip_id, '') AS tripId,
              t.category, t.type, t.amount, COALESCE(tr.name, '') AS tripName
       FROM transactions t
       LEFT JOIN trips tr ON tr.id = t.trip_id
       ORDER BY t.date ASC, t.created_at ASC`
    );

    const headers = ["Date", "Description", "Amount", "Type", "Parent Category", "Category", "Trip"];
    const csvRows = [headers.map(csvQuote).join(",")];

    for (const row of rows) {
      const normalized = normalizeCategory({
        value: row.category,
        parentCategory: row.parentCategory,
        type: row.type,
        description: row.description
      });

      const line = [
        row.date,
        row.description,
        Number(row.amount).toFixed(2),
        row.type,
        normalized.parentCategory,
        normalized.category,
        row.tripName
      ]
        .map(csvQuote)
        .join(",");

      csvRows.push(line);
    }

    const payload = `${csvRows.join("\r\n")}\r\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=budget-pulse-backup.csv");
    res.send(payload);
  } catch {
    res.status(500).json({ error: "Failed To Export Backup CSV" });
  }
});

function csvQuote(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Budget Dashboard Running On http://localhost:${PORT}`);
});
