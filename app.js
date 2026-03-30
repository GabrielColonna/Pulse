const CATEGORY_MODEL = {
  income: [
    {
      name: "Income",
      subcategories: [
        { name: "Salary", keywords: ["paycheck", "salary"] },
        { name: "Gambling", keywords: ["gamble", "casino", "fliff", "underdog", "hard rock", "prize picks", "prizepicks"] },
        { name: "Reselling", keywords: ["resell", "marketplace", "ebay", "jersey", "stockx"] },
        { name: "Financial Aid", keywords: ["financial aid", "grant", "scholarship", "fafsa"] },
        { name: "Other Income", keywords: ["bonus", "refund", "reimbursement", "cashback"] }
      ]
    }
  ],
  expense: [
    {
      name: "Personal",
      subcategories: [
        { name: "Entertainment / Activities", keywords: ["entertainment", "movie", "netflix", "amc", "top golf", "miami heat", "poker", "tequila", "drinks", "heat tickets"] },
        { name: "Food", keywords: ["chipotle", "cfa", "shake shack", "mcd", "mcdonalds", "flanigans", "pubsub", "burger king", "bk", "rcg vending"] },
        { name: "Haircut", keywords: ["haircut", "barber", "salon"] },
        { name: "Soccer", keywords: ["soccer", "stadio", "fut5ive", "futbol", "la redonda", "ags"] },
        { name: "Gaming", keywords: ["psn", "playstation", "gaming", "sony", "marvel rivals", "nba2k", "steam"] },
        { name: "Shopping", keywords: ["shopping", "amazon", "clothes", "amz", "zara", "souvenir"] },
        { name: "Other", keywords: ["other", "misc"] }
      ]
    },
    {
      name: "Expenses",
      subcategories: [
        { name: "Memberships", keywords: ["membership", "subscription", "gym", "icloud", "planet fitness", "coursera", "microsoft 365", "pf monthly", "annual fee"] },
        { name: "Car Payments", keywords: ["car payment", "auto loan", "pay off car"] },
        { name: "Insurance", keywords: ["insurance", "geico"] },
        { name: "Groceries", keywords: ["grocery", "walmart", "costco", "aldi", "target", "publix", "trader joe", "walgreens", "xeela"] },
        { name: "Investments", keywords: ["investment", "stock", "crypto", "savings", "wealthfront", "xrp"] },
        { name: "Losses", keywords: ["loss", "chargeback", "doctor", "copay", "parking ticket", "parking citation"] }
      ]
    },
    {
      name: "Car",
      subcategories: [
        { name: "Gas", keywords: ["gas", "fuel", "shell", "chevron"] },
        { name: "Oil Changes", keywords: ["oil change", "tire kingdom"] },
        { name: "Repairs", keywords: ["repair", "maintenance", "mechanic", "car tow", "tow", "brake", "registration renewal"] },
        { name: "Tolls", keywords: ["toll", "tolls"] },
        { name: "Parking", keywords: ["parking"] },
        { name: "Other", keywords: ["registration", "dmv"] }
      ]
    },
    {
      name: "Travel",
      subcategories: [
        { name: "Hotel", keywords: ["hotel", "airbnb", "bnb", "hostel"] },
        { name: "Flights", keywords: ["flight", "airfare", "spirit", "checked bag", "seatbid", "flight to", "san fran flights"] },
        { name: "Rental", keywords: ["rental", "rent car", "car rental"] },
        { name: "Activities", keywords: ["activity"] }
      ]
    },
    {
      name: "Girlfriend",
      subcategories: [
        { name: "Gifts", keywords: ["flowers", "vday", "valentines"] },
        { name: "Dates", keywords: ["date night", "olive garden", "divieto", "north italia", "wood one ramen"] },
        { name: "Other", keywords: ["gabby", "publix stuff"] }
      ]
    }
  ]
};

const CHART_COLORS = ["#b400ff", "#ff2bd6", "#35ff86", "#ff4766", "#7f5cff", "#00f0ff"];
const SAVINGS_GOAL_STORAGE_KEY = "pulse.savingsGoal";
const PRIVACY_PIN = "0307";
const API_BASE = normalizeApiBase(window.__PULSE_API_BASE__ || "");

function normalizeApiBase(rawBase) {
  const base = String(rawBase || "").trim();
  if (!base) {
    return "";
  }

  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function buildApiUrl(pathname) {
  const path = String(pathname || "");
  if (/^https?:\/\//i.test(path) || !API_BASE) {
    return path;
  }

  return path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

function apiFetch(pathname, options) {
  return fetch(buildApiUrl(pathname), options);
}

const state = {
  transactions: [],
  trips: [],
  editingId: null,
  monthOffset: 0,
  monthLogDeleteMode: false,
  monthLogSelectedIds: new Set(),
  savingsGoal: {
    name: "",
    targetAmount: 0,
    bufferMonths: 2
  },
  tripSummaryFilter: {
    trip: "all"
  },
  importPreview: null,
  monthLogFilters: {
    query: "",
    type: "all",
    parent: "all",
    subcategory: "all"
  },
  charts: {
    expenseCategory: null
  }
};

let formMessageTimeoutId = null;
let importMessageTimeoutId = null;
let appDialogResolver = null;
let appDialogMode = "confirm";
let hasInitializedDashboard = false;

const els = {
  privacyGate: document.getElementById("privacyGate"),
  privacyPinInput: document.getElementById("privacyPinInput"),
  privacyUnlockButton: document.getElementById("privacyUnlockButton"),
  privacyError: document.getElementById("privacyError"),
  appShell: document.querySelector(".app-shell"),
  sidebarToggleButton: document.getElementById("sidebarToggleButton"),
  openUserProfileButton: document.getElementById("openUserProfileButton"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  form: document.getElementById("entryForm"),
  description: document.getElementById("description"),
  amount: document.getElementById("amount"),
  entryDate: document.getElementById("entryDate"),
  entryType: document.getElementById("entryType"),
  parentCategorySelect: document.getElementById("parentCategorySelect"),
  subcategorySelect: document.getElementById("subcategorySelect"),
  tripAccordion: document.querySelector(".trip-accordion"),
  recurrenceAccordion: document.querySelector(".recurrence-accordion"),
  tripSelect: document.getElementById("tripSelect"),
  recurrenceFrequency: document.getElementById("recurrenceFrequency"),
  recurrenceCount: document.getElementById("recurrenceCount"),
  openSavingsButton: document.getElementById("openSavingsButton"),
  createTripButton: document.getElementById("createTripButton"),
  openTripSummaryButton: document.getElementById("openTripSummaryButton"),
  submitButton: document.getElementById("submitButton"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  formMessage: document.getElementById("formMessage"),
  balanceValue: document.getElementById("balanceValue"),
  incomeValue: document.getElementById("incomeValue"),
  expenseValue: document.getElementById("expenseValue"),
  savingsRateValue: document.getElementById("savingsRateValue"),
  yearNetValue: document.getElementById("yearNetValue"),
  yearIncomeValue: document.getElementById("yearIncomeValue"),
  yearSpendingValue: document.getElementById("yearSpendingValue"),
  yearSavingsRateValue: document.getElementById("yearSavingsRateValue"),
  expenseCategoryChart: document.getElementById("expenseCategoryChart"),
  recentEntries: document.getElementById("recentEntries"),
  parentTotalsGrid: document.getElementById("parentTotalsGrid"),
  prevMonthButton: document.getElementById("prevMonthButton"),
  nextMonthButton: document.getElementById("nextMonthButton"),
  activeMonthLabel: document.getElementById("activeMonthLabel"),
  monthSpendingValue: document.getElementById("monthSpendingValue"),
  monthNetValue: document.getElementById("monthNetValue"),
  netMetricCard: document.getElementById("netMetricCard"),
  openMonthLogButton: document.getElementById("openMonthLogButton"),
  monthLogModal: document.getElementById("monthLogModal"),
  closeMonthLogButton: document.getElementById("closeMonthLogButton"),
  monthLogDeleteModeButton: document.getElementById("monthLogDeleteModeButton"),
  monthLogBulkActions: document.getElementById("monthLogBulkActions"),
  monthLogSelectAllButton: document.getElementById("monthLogSelectAllButton"),
  monthLogDeselectAllButton: document.getElementById("monthLogDeselectAllButton"),
  monthLogDeleteSelectedButton: document.getElementById("monthLogDeleteSelectedButton"),
  monthLogSelectHeader: document.getElementById("monthLogSelectHeader"),
  monthLogSubtitle: document.getElementById("monthLogSubtitle"),
  monthLogBody: document.getElementById("monthLogBody"),
  monthLogTotals: document.getElementById("monthLogTotals"),
  monthLogSearch: document.getElementById("monthLogSearch"),
  monthLogTypeFilter: document.getElementById("monthLogTypeFilter"),
  monthLogParentFilter: document.getElementById("monthLogParentFilter"),
  monthLogSubcategoryFilter: document.getElementById("monthLogSubcategoryFilter"),
  tripSummaryModal: document.getElementById("tripSummaryModal"),
  closeTripSummaryButton: document.getElementById("closeTripSummaryButton"),
  tripSummaryTripFilter: document.getElementById("tripSummaryTripFilter"),
  tripSummarySubtitle: document.getElementById("tripSummarySubtitle"),
  tripSummaryBody: document.getElementById("tripSummaryBody"),
  tripSummaryTotals: document.getElementById("tripSummaryTotals"),
  importPreviewModal: document.getElementById("importPreviewModal"),
  closeImportPreviewButton: document.getElementById("closeImportPreviewButton"),
  cancelImportPreviewButton: document.getElementById("cancelImportPreviewButton"),
  confirmImportButton: document.getElementById("confirmImportButton"),
  importPreviewSubtitle: document.getElementById("importPreviewSubtitle"),
  importPreviewSummary: document.getElementById("importPreviewSummary"),
  importPreviewBody: document.getElementById("importPreviewBody"),
  importMapDate: document.getElementById("importMapDate"),
  importMapDescription: document.getElementById("importMapDescription"),
  importMapAmount: document.getElementById("importMapAmount"),
  importMapType: document.getElementById("importMapType"),
  importMapParentCategory: document.getElementById("importMapParentCategory"),
  importMapCategory: document.getElementById("importMapCategory"),
  importMapTrip: document.getElementById("importMapTrip"),
  importSkipDuplicates: document.getElementById("importSkipDuplicates"),
  appDialogModal: document.getElementById("appDialogModal"),
  appDialogTitle: document.getElementById("appDialogTitle"),
  appDialogMessage: document.getElementById("appDialogMessage"),
  appDialogInputWrap: document.getElementById("appDialogInputWrap"),
  appDialogInput: document.getElementById("appDialogInput"),
  appDialogConfirmButton: document.getElementById("appDialogConfirmButton"),
  appDialogCancelButton: document.getElementById("appDialogCancelButton"),
  savingsModal: document.getElementById("savingsModal"),
  closeSavingsButton: document.getElementById("closeSavingsButton"),
  savingsGoalName: document.getElementById("savingsGoalName"),
  savingsGoalAmount: document.getElementById("savingsGoalAmount"),
  savingsBufferMonths: document.getElementById("savingsBufferMonths"),
  saveSavingsGoalButton: document.getElementById("saveSavingsGoalButton"),
  savingsSummaryCards: document.getElementById("savingsSummaryCards"),
  savingsInsightsList: document.getElementById("savingsInsightsList"),
  resetMonthLogFilters: document.getElementById("resetMonthLogFilters"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  backupButton: document.getElementById("backupButton"),
  excelFile: document.getElementById("excelFile"),
  importButton: document.getElementById("importButton"),
  importMessage: document.getElementById("importMessage")
};

async function init() {
  if (!initializePrivacyGate()) {
    return;
  }

  await initializeDashboard();
}

function initializePrivacyGate() {
  if (!els.privacyGate || !els.appShell || !els.privacyPinInput || !els.privacyUnlockButton) {
    return true;
  }

  els.privacyGate.hidden = false;
  els.appShell.hidden = true;
  els.privacyPinInput.value = "";
  els.privacyPinInput.focus();

  els.privacyUnlockButton.addEventListener("click", onPrivacyUnlockAttempt);
  els.privacyPinInput.addEventListener("keydown", onPrivacyPinKeydown);
  return false;
}

function onPrivacyPinKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onPrivacyUnlockAttempt();
  }
}

function waitFor(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function onPrivacyUnlockAttempt() {
  const inputPin = String(els.privacyPinInput.value || "").trim();
  if (inputPin !== PRIVACY_PIN) {
    if (els.privacyError) {
      els.privacyError.textContent = "Incorrect PIN. Try Again.";
      els.privacyError.style.color = "#ff4766";
    }
    els.privacyPinInput.value = "";
    els.privacyPinInput.focus();
    return;
  }

  if (els.privacyError) {
    els.privacyError.textContent = "Access Granted.";
    els.privacyError.style.color = "#86ffb8";
  }

  els.privacyUnlockButton.disabled = true;
  els.privacyPinInput.disabled = true;
  els.privacyGate.classList.add("privacy-unlock-success");

  await waitFor(1000);

  els.privacyGate.hidden = true;
  els.appShell.hidden = false;
  await initializeDashboard();
}

async function initializeDashboard() {
  if (hasInitializedDashboard) {
    return;
  }

  hasInitializedDashboard = true;
  hydrateSidebarState();
  hydrateSavingsGoal();
  setDefaultDate();
  populateParentCategories("expense");
  if (els.tripAccordion) {
    els.tripAccordion.open = false;
  }
  if (els.recurrenceAccordion) {
    els.recurrenceAccordion.open = false;
  }
  await refreshTrips();
  wireEvents();
  suggestCategoryFromDescription();
  await refreshTransactions();
}

function wireEvents() {
  if (els.sidebarToggleButton) {
    els.sidebarToggleButton.addEventListener("click", toggleSidebarCollapsed);
  }
  if (els.openUserProfileButton) {
    els.openUserProfileButton.addEventListener("click", onOpenUserProfile);
  }
  if (els.openSettingsButton) {
    els.openSettingsButton.addEventListener("click", onOpenSettings);
  }
  if (els.openSavingsButton) {
    els.openSavingsButton.addEventListener("click", openSavingsModal);
  }
  els.description.addEventListener("input", suggestCategoryFromDescription);
  els.entryType.addEventListener("change", onTypeChange);
  els.parentCategorySelect.addEventListener("change", onParentCategoryChange);
  els.recurrenceFrequency.addEventListener("change", onRecurrenceFrequencyChanged);
  els.createTripButton.addEventListener("click", onCreateTrip);
  els.form.addEventListener("submit", onSubmitEntry);
  els.cancelEditButton.addEventListener("click", exitEditMode);
  els.clearButton.addEventListener("click", clearAllData);
  els.exportButton.addEventListener("click", exportToCsv);
  els.backupButton.addEventListener("click", exportBackupCsv);
  els.importButton.addEventListener("click", openImportFilePicker);
  els.excelFile.addEventListener("change", importFromFile);
  els.recentEntries.addEventListener("click", onRecentAction);
  els.prevMonthButton.addEventListener("click", () => shiftMonth(1));
  els.nextMonthButton.addEventListener("click", () => shiftMonth(-1));
  els.openMonthLogButton.addEventListener("click", openMonthLogModal);
  els.openTripSummaryButton.addEventListener("click", openTripSummaryModal);
  els.closeMonthLogButton.addEventListener("click", closeMonthLogModal);
  els.monthLogDeleteModeButton.addEventListener("click", toggleMonthLogDeleteMode);
  els.monthLogSelectAllButton.addEventListener("click", selectAllMonthLogRows);
  els.monthLogDeselectAllButton.addEventListener("click", deselectAllMonthLogRows);
  els.monthLogDeleteSelectedButton.addEventListener("click", deleteSelectedMonthLogRows);
  els.closeTripSummaryButton.addEventListener("click", closeTripSummaryModal);
  els.monthLogModal.addEventListener("click", onModalBackdropClick);
  els.tripSummaryModal.addEventListener("click", onModalBackdropClick);
  els.importPreviewModal.addEventListener("click", onModalBackdropClick);
  els.appDialogModal.addEventListener("click", onModalBackdropClick);
  if (els.savingsModal) {
    els.savingsModal.addEventListener("click", onModalBackdropClick);
  }
  els.closeImportPreviewButton.addEventListener("click", closeImportPreviewModal);
  els.cancelImportPreviewButton.addEventListener("click", closeImportPreviewModal);
  if (els.closeSavingsButton) {
    els.closeSavingsButton.addEventListener("click", closeSavingsModal);
  }
  if (els.saveSavingsGoalButton) {
    els.saveSavingsGoalButton.addEventListener("click", saveSavingsGoal);
  }
  els.appDialogConfirmButton.addEventListener("click", onAppDialogConfirm);
  els.appDialogCancelButton.addEventListener("click", onAppDialogCancel);
  els.appDialogInput.addEventListener("keydown", onAppDialogInputKeydown);
  els.confirmImportButton.addEventListener("click", commitImportPreview);
  els.importMapDate.addEventListener("change", onImportMappingChanged);
  els.importMapDescription.addEventListener("change", onImportMappingChanged);
  els.importMapAmount.addEventListener("change", onImportMappingChanged);
  els.importMapType.addEventListener("change", onImportMappingChanged);
  els.importMapParentCategory.addEventListener("change", onImportMappingChanged);
  els.importMapCategory.addEventListener("change", onImportMappingChanged);
  els.importMapTrip.addEventListener("change", onImportMappingChanged);
  els.monthLogSearch.addEventListener("input", onMonthLogFiltersChanged);
  els.monthLogTypeFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.monthLogParentFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.monthLogSubcategoryFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.tripSummaryTripFilter.addEventListener("change", onTripSummaryFilterChanged);
  els.resetMonthLogFilters.addEventListener("click", resetMonthLogFilters);
  els.monthLogBody.addEventListener("click", onMonthLogAction);
  els.monthLogBody.addEventListener("change", onMonthLogSelectionChanged);
}

function hydrateSidebarState() {
  if (!els.appShell || !els.sidebarToggleButton) {
    return;
  }

  const isCollapsed = window.localStorage.getItem("pulse.sidebarCollapsed") === "true";
  setSidebarCollapsed(isCollapsed);
}

function setSidebarCollapsed(isCollapsed) {
  if (!els.appShell || !els.sidebarToggleButton) {
    return;
  }

  els.appShell.classList.toggle("sidebar-collapsed", isCollapsed);
  els.sidebarToggleButton.textContent = isCollapsed ? "Expand" : "Collapse";
  els.sidebarToggleButton.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
  els.sidebarToggleButton.setAttribute("aria-label", isCollapsed ? "Expand Sidebar" : "Collapse Sidebar");
}

function toggleSidebarCollapsed() {
  if (!els.appShell) {
    return;
  }

  const isCollapsed = !els.appShell.classList.contains("sidebar-collapsed");
  setSidebarCollapsed(isCollapsed);
  window.localStorage.setItem("pulse.sidebarCollapsed", String(isCollapsed));
}

function onOpenUserProfile() {
  setImportMessage("User Profile Is Coming Soon. This Slot Is Ready For Auth/Profile Integration.", false);
}

function onOpenSettings() {
  setImportMessage("Settings Panel Is Coming Soon. This Slot Is Ready For Preferences, Theme, And Security.", false);
}

function hydrateSavingsGoal() {
  try {
    const raw = window.localStorage.getItem(SAVINGS_GOAL_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const name = String(parsed?.name || "").trim();
    const targetAmount = Number(parsed?.targetAmount || 0);
    const bufferMonths = Number.isFinite(Number(parsed?.bufferMonths)) ? Number(parsed?.bufferMonths) : 2;
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return;
    }

    state.savingsGoal = {
      name,
      targetAmount,
      bufferMonths: Math.max(0, Math.min(24, Math.round(bufferMonths)))
    };
  } catch {
    // Ignore malformed saved state and keep defaults.
  }
}

function persistSavingsGoal() {
  if (!state.savingsGoal.name || state.savingsGoal.targetAmount <= 0) {
    window.localStorage.removeItem(SAVINGS_GOAL_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SAVINGS_GOAL_STORAGE_KEY, JSON.stringify(state.savingsGoal));
}

function openSavingsModal() {
  if (!els.savingsModal) {
    return;
  }

  els.savingsGoalName.value = state.savingsGoal.name;
  els.savingsGoalAmount.value = state.savingsGoal.targetAmount > 0 ? String(state.savingsGoal.targetAmount) : "";
  els.savingsBufferMonths.value = String(Math.max(0, Math.min(24, Math.round(state.savingsGoal.bufferMonths || 2))));
  renderSavingsInsights();
  els.savingsModal.hidden = false;
}

function closeSavingsModal() {
  if (!els.savingsModal) {
    return;
  }

  els.savingsModal.hidden = true;
}

function saveSavingsGoal() {
  const name = String(els.savingsGoalName.value || "").trim();
  const targetAmount = Number(els.savingsGoalAmount.value);
  const bufferMonths = Math.round(Number(els.savingsBufferMonths.value));

  if (!name) {
    setImportMessage("Savings Goal Name Is Required.", true);
    return;
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    setImportMessage("Savings Target Must Be Greater Than 0.", true);
    return;
  }

  if (!Number.isFinite(bufferMonths) || bufferMonths < 0 || bufferMonths > 24) {
    setImportMessage("Comfort Buffer Months Must Be Between 0 And 24.", true);
    return;
  }

  state.savingsGoal = { name, targetAmount, bufferMonths };
  persistSavingsGoal();
  renderSavingsInsights();
  setImportMessage("Savings Goal Saved.", false);
}

function getSavingsMetrics() {
  let totalIncome = 0;
  let totalSpending = 0;
  const monthTotals = new Map();

  for (const tx of state.transactions) {
    const amount = Number(tx.amount || 0);
    if (!Number.isFinite(amount)) {
      continue;
    }

    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalSpending += amount;
    }

    const key = String(tx.date || "").slice(0, 7);
    if (!monthTotals.has(key)) {
      monthTotals.set(key, { income: 0, spending: 0 });
    }

    const bucket = monthTotals.get(key);
    if (tx.type === "income") {
      bucket.income += amount;
    } else {
      bucket.spending += amount;
    }
  }

  const monthsTracked = monthTotals.size;
  const currentSaved = totalIncome - totalSpending;
  const avgMonthlyIncome = monthsTracked > 0 ? totalIncome / monthsTracked : 0;
  const avgMonthlySpending = monthsTracked > 0 ? totalSpending / monthsTracked : 0;
  const avgMonthlyNet = monthsTracked > 0 ? currentSaved / monthsTracked : 0;
  const spendingRatio = totalIncome > 0 ? totalSpending / totalIncome : 0;

  const target = Number(state.savingsGoal.targetAmount || 0);
  const bufferMonths = Math.max(0, Math.min(24, Math.round(Number(state.savingsGoal.bufferMonths || 2))));
  const comfortBuffer = avgMonthlySpending * bufferMonths;
  const comfortableSaved = Math.max(0, currentSaved - comfortBuffer);
  const requiredComfortTotal = target > 0 ? target + comfortBuffer : 0;
  const progressRaw = target > 0 ? (comfortableSaved / target) * 100 : 0;
  const progress = Math.max(0, Math.min(100, progressRaw));
  const remaining = target > 0 ? Math.max(0, target - comfortableSaved) : 0;
  const monthsToGoal = target > 0 && avgMonthlyNet > 0
    ? Math.ceil(Math.max(0, requiredComfortTotal - currentSaved) / avgMonthlyNet)
    : null;

  return {
    totalIncome,
    totalSpending,
    currentSaved,
    avgMonthlyIncome,
    avgMonthlySpending,
    avgMonthlyNet,
    spendingRatio,
    monthsTracked,
    target,
    bufferMonths,
    comfortBuffer,
    comfortableSaved,
    requiredComfortTotal,
    progress,
    remaining,
    monthsToGoal
  };
}

function renderSavingsInsights() {
  if (!els.savingsSummaryCards || !els.savingsInsightsList) {
    return;
  }

  const metrics = getSavingsMetrics();
  const goalName = state.savingsGoal.name || "No Goal Set";
  const targetText = metrics.target > 0 ? formatMoney(metrics.target) : "Set A Target";
  const remainingText = metrics.target > 0 ? formatMoney(metrics.remaining) : "-";
  const progressText = metrics.target > 0 ? `${Math.round(metrics.progress)}%` : "-";
  const monthsText = metrics.monthsToGoal ? `${metrics.monthsToGoal} Month${metrics.monthsToGoal === 1 ? "" : "s"}` : "-";

  els.savingsSummaryCards.innerHTML = `
    <article class="savings-card"><p>Goal</p><h4>${escapeHtml(goalName)}</h4></article>
    <article class="savings-card"><p>Target</p><h4>${targetText}</h4></article>
    <article class="savings-card"><p>Net Saved (Raw)</p><h4>${formatMoney(metrics.currentSaved)}</h4></article>
    <article class="savings-card"><p>Comfort Buffer</p><h4>${formatMoney(metrics.comfortBuffer)}</h4></article>
    <article class="savings-card"><p>Safe To Use For Goal</p><h4>${formatMoney(metrics.comfortableSaved)}</h4></article>
    <article class="savings-card"><p>Remaining</p><h4>${remainingText}</h4></article>
    <article class="savings-card"><p>Progress</p><h4>${progressText}</h4></article>
    <article class="savings-card"><p>Est. Time To Goal</p><h4>${monthsText}</h4></article>
    <article class="savings-card"><p>Avg Monthly Income</p><h4>${formatMoney(metrics.avgMonthlyIncome)}</h4></article>
    <article class="savings-card"><p>Avg Monthly Spending</p><h4>${formatMoney(metrics.avgMonthlySpending)}</h4></article>
    <article class="savings-card"><p>Avg Monthly Net</p><h4>${formatMoney(metrics.avgMonthlyNet)}</h4></article>
  `;

  const insights = [];
  if (metrics.monthsTracked === 0) {
    insights.push("Add Transactions To Start Tracking Savings Insights.");
  } else {
    insights.push(`Tracking ${metrics.monthsTracked} Month${metrics.monthsTracked === 1 ? "" : "s"} Of Data.`);

    if (metrics.avgMonthlyNet > 0) {
      insights.push(`At Your Current Pace, You Add About ${formatMoney(metrics.avgMonthlyNet)} Per Month.`);
    } else if (metrics.avgMonthlyNet < 0) {
      insights.push(`Your Average Net Is ${formatMoney(metrics.avgMonthlyNet)} Per Month. Reduce Spending Or Increase Income To Reach The Goal.`);
    } else {
      insights.push("Your Monthly Net Is Around Break-Even. Any Spending Cuts Can Accelerate Progress.");
    }

    insights.push(`Comfort Rule: Reserve ${metrics.bufferMonths} Month${metrics.bufferMonths === 1 ? "" : "s"} Of Average Spending (${formatMoney(metrics.comfortBuffer)}) Before Counting Goal Progress.`);

    if (metrics.spendingRatio >= 0.85) {
      insights.push("Spending Is Using Most Of Income. Consider A Spending Cap For Top Expense Categories.");
    } else if (metrics.spendingRatio <= 0.65) {
      insights.push("Great Discipline: You Keep A Strong Gap Between Income And Spending.");
    } else {
      insights.push("You Are In A Balanced Zone. Small Weekly Cuts Can Still Improve Goal Speed.");
    }

    if (metrics.target > 0 && metrics.comfortableSaved >= metrics.target) {
      insights.push("Goal Reached Comfortably. You Hit The Target While Keeping A Safety Buffer.");
    } else if (metrics.target > 0 && metrics.monthsToGoal) {
      insights.push(`Estimated Comfortable Completion: About ${metrics.monthsToGoal} Month${metrics.monthsToGoal === 1 ? "" : "s"} At Current Averages.`);
    }
  }

  els.savingsInsightsList.innerHTML = insights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function onRecurrenceFrequencyChanged() {
  const isOneTime = els.recurrenceFrequency.value === "none";
  if (isOneTime) {
    els.recurrenceCount.value = "1";
    els.recurrenceCount.disabled = true;
    return;
  }

  els.recurrenceCount.disabled = false;
}

async function refreshTrips() {
  try {
    const response = await apiFetch("/api/trips");
    if (!response.ok) {
      throw new Error("Could Not Fetch Trips");
    }

    state.trips = await response.json();
    hydrateTripOptions();
  } catch {
    state.trips = [];
    hydrateTripOptions();
  }
}

function hydrateTripOptions() {
  const currentValue = els.tripSelect.value;
  els.tripSelect.innerHTML = [
    '<option value="">No Trip</option>',
    ...state.trips.map((trip) => `<option value="${escapeHtml(trip.id)}">${escapeHtml(trip.name)}</option>`)
  ].join("");

  if (currentValue && state.trips.some((trip) => trip.id === currentValue)) {
    els.tripSelect.value = currentValue;
  }

  const previousTripSummary = state.tripSummaryFilter.trip;

  els.tripSummaryTripFilter.innerHTML = [
    '<option value="all">All Trips</option>',
    ...state.trips.map((trip) => `<option value="${escapeHtml(trip.id)}">${escapeHtml(trip.name)}</option>`)
  ].join("");
  state.tripSummaryFilter.trip = state.trips.some((trip) => trip.id === previousTripSummary) ? previousTripSummary : "all";
  els.tripSummaryTripFilter.value = state.tripSummaryFilter.trip;
}

async function onCreateTrip() {
  const rawName = await requestPrompt({
    title: "Create New Trip",
    message: "Enter A New Trip Name:",
    confirmText: "Create",
    cancelText: "Cancel",
    initialValue: ""
  });
  const name = String(rawName || "").trim();
  if (!name) {
    setImportMessage("Trip Creation Canceled.", false);
    return;
  }

  try {
    const response = await apiFetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Trip Create Failed"));
    }

    const trip = await response.json();
    const existingIndex = state.trips.findIndex((item) => item.id === trip.id);
    if (existingIndex >= 0) {
      state.trips[existingIndex] = trip;
    } else {
      state.trips.push(trip);
      state.trips.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    hydrateTripOptions();
    els.tripSelect.value = trip.id;
    setImportMessage(`Trip Added: ${trip.name}`, false);
    renderTripSummary();
  } catch (error) {
    setImportMessage(error.message || "Could Not Create Trip.", true);
  }
}

function getTripNameById(tripId) {
  const cleanId = String(tripId || "").trim();
  if (!cleanId) {
    return "";
  }

  const trip = state.trips.find((item) => item.id === cleanId);
  return trip ? trip.name : "";
}

function onModalBackdropClick(event) {
  if (event.target === els.monthLogModal) {
    closeMonthLogModal();
    return;
  }

  if (event.target === els.tripSummaryModal) {
    closeTripSummaryModal();
    return;
  }

  if (event.target === els.importPreviewModal) {
    closeImportPreviewModal();
    return;
  }

  if (event.target === els.appDialogModal) {
    onAppDialogCancel();
    return;
  }

  if (event.target === els.savingsModal) {
    closeSavingsModal();
  }
}

function openAppDialog(config) {
  if (appDialogResolver) {
    appDialogResolver(config.mode === "prompt" ? null : false);
    appDialogResolver = null;
  }

  appDialogMode = config.mode || "confirm";
  els.appDialogTitle.textContent = config.title || "Confirm Action";
  els.appDialogMessage.textContent = config.message || "";
  els.appDialogCancelButton.textContent = config.cancelText || "Cancel";
  els.appDialogConfirmButton.textContent = config.confirmText || "Confirm";
  els.appDialogConfirmButton.className = config.tone === "danger" ? "danger-btn" : "primary-btn";

  if (appDialogMode === "prompt") {
    els.appDialogInputWrap.hidden = false;
    els.appDialogInput.value = config.initialValue || "";
    els.appDialogInput.focus();
    els.appDialogInput.select();
  } else {
    els.appDialogInputWrap.hidden = true;
    els.appDialogInput.value = "";
    els.appDialogConfirmButton.focus();
  }

  els.appDialogModal.hidden = false;

  return new Promise((resolve) => {
    appDialogResolver = resolve;
  });
}

function closeAppDialog(result) {
  if (!appDialogResolver) {
    return;
  }

  const resolver = appDialogResolver;
  appDialogResolver = null;
  els.appDialogModal.hidden = true;
  resolver(result);
}

function onAppDialogConfirm() {
  if (appDialogMode === "prompt") {
    closeAppDialog(els.appDialogInput.value);
    return;
  }

  closeAppDialog(true);
}

function onAppDialogCancel() {
  closeAppDialog(appDialogMode === "prompt" ? null : false);
}

function onAppDialogInputKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onAppDialogConfirm();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    onAppDialogCancel();
  }
}

async function requestConfirm(options) {
  return openAppDialog({
    mode: "confirm",
    title: options.title || "Confirm Action",
    message: options.message || "Are You Sure?",
    confirmText: options.confirmText || "Confirm",
    cancelText: options.cancelText || "Cancel",
    tone: options.tone || "danger"
  });
}

async function requestPrompt(options) {
  return openAppDialog({
    mode: "prompt",
    title: options.title || "Enter Value",
    message: options.message || "Provide A Value",
    confirmText: options.confirmText || "Save",
    cancelText: options.cancelText || "Cancel",
    tone: options.tone || "primary",
    initialValue: options.initialValue || ""
  });
}

function shiftMonth(delta) {
  state.monthOffset += delta;
  render();
}

function onTypeChange() {
  populateParentCategories(els.entryType.value);
  suggestCategoryFromDescription();
}

function onParentCategoryChange() {
  populateSubcategories(els.entryType.value, els.parentCategorySelect.value);
}

function setDefaultDate() {
  const today = new Date();
  els.entryDate.value = formatDateInput(today);
}

function getGroups(type) {
  return CATEGORY_MODEL[type] || [];
}

function getSubcategories(type, parentCategory) {
  const group = getGroups(type).find((item) => item.name === parentCategory);
  return group ? group.subcategories : [];
}

function populateParentCategories(type, selectedParent) {
  const groups = getGroups(type);
  const forcedParent = type === "income" ? "Income" : selectedParent;

  els.parentCategorySelect.innerHTML = groups
    .map((group) => `<option value="${escapeHtml(group.name)}">${escapeHtml(group.name)}</option>`)
    .join("");

  const fallback = groups[0]?.name || "";
  const finalParent = forcedParent && groups.some((group) => group.name === forcedParent)
    ? forcedParent
    : fallback;

  toggleParentCategoryField(type);
  els.parentCategorySelect.value = finalParent;
  populateSubcategories(type, finalParent);
}

function toggleParentCategoryField(type) {
  const parentCategoryField = els.parentCategorySelect.closest("label");
  if (!parentCategoryField) {
    return;
  }

  const isIncome = type === "income";
  parentCategoryField.hidden = isIncome;
  els.parentCategorySelect.disabled = isIncome;
}

function populateSubcategories(type, parentCategory, selectedSubcategory) {
  const subcategories = getSubcategories(type, parentCategory);
  els.subcategorySelect.innerHTML = subcategories
    .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    .join("");

  const fallback = subcategories[0]?.name || "";
  els.subcategorySelect.value = selectedSubcategory && subcategories.some((item) => item.name === selectedSubcategory)
    ? selectedSubcategory
    : fallback;
}

function classifyCategory(description, type) {
  const lower = (description || "").toLowerCase();

  for (const group of getGroups(type)) {
    for (const subcategory of group.subcategories) {
      if (subcategory.keywords.some((keyword) => lower.includes(keyword))) {
        return { parentCategory: group.name, category: subcategory.name };
      }
    }
  }

  return type === "income"
    ? { parentCategory: "Income", category: "Salary" }
    : { parentCategory: "Personal", category: "Food" };
}

function suggestCategoryFromDescription() {
  const suggested = classifyCategory(els.description.value, els.entryType.value);
  populateParentCategories(els.entryType.value, suggested.parentCategory);
  populateSubcategories(els.entryType.value, suggested.parentCategory, suggested.category);
}

function getActiveMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - state.monthOffset, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end };
}

function getTransactionsForActiveMonth() {
  const { start, end } = getActiveMonthRange();
  return state.transactions.filter((tx) => {
    const d = parseDateOnly(tx.date);
    return !Number.isNaN(d.valueOf()) && d >= start && d < end;
  });
}

async function refreshTransactions() {
  try {
    const response = await apiFetch("/api/transactions");
    if (!response.ok) {
      throw new Error("Could Not Fetch Transactions");
    }

    state.transactions = await response.json();
    render();
  } catch {
    setMessage("Unable To Load Dashboard Data From Server.", true);
  }
}

async function onSubmitEntry(event) {
  event.preventDefault();

  const description = els.description.value.trim();
  const amount = Number(els.amount.value);
  const type = els.entryType.value;
  const date = els.entryDate.value;
  const parentCategory = els.parentCategorySelect.value;
  const category = els.subcategorySelect.value;
  const tripId = els.tripSelect.value;
  const recurrenceFrequency = els.recurrenceFrequency.value;
  const recurrenceCount = Number(els.recurrenceCount.value || 1);

  if (!description) {
    setMessage("Description Is Required.", true);
    return;
  }

  if (Number.isNaN(amount) || amount <= 0) {
    setMessage("Amount Must Be Greater Than 0.", true);
    return;
  }

  if (!date) {
    setMessage("Date Is Invalid Or Missing.", true);
    return;
  }

  if (!parentCategory) {
    setMessage("Parent Category Is Required.", true);
    return;
  }

  if (!category) {
    setMessage("Subcategory Is Required.", true);
    return;
  }

  if (!["none", "monthly", "weekly", "biweekly"].includes(recurrenceFrequency)) {
    setMessage("Recurring Frequency Is Invalid.", true);
    return;
  }

  if (!Number.isInteger(recurrenceCount) || recurrenceCount < 1 || recurrenceCount > 36) {
    setMessage("Number Of Entries Must Be Between 1 And 36.", true);
    return;
  }

  const payload = { description, amount, type, date, parentCategory, category, tripId };

  try {
    if (state.editingId) {
      const response = await apiFetch(`/api/transactions/${state.editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Update Failed"));
      }

      const updated = await response.json();
      state.transactions = state.transactions.map((tx) => (tx.id === updated.id ? updated : tx));
      setMessage("Transaction Updated.", false);
      exitEditMode({ keepMessage: true });
    } else {
      const response = await apiFetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          recurrenceFrequency,
          recurrenceCount
        })
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Create Failed"));
      }

      const created = await response.json();

      if (Array.isArray(created?.created)) {
        state.transactions = [...created.created, ...state.transactions];
        setMessage(`Saved ${created.created.length} Transaction(s).`, false);
      } else {
        state.transactions.unshift(created);
        setMessage("Transaction Saved.", false);
      }

      resetForm();
    }

    if (els.tripAccordion) {
      els.tripAccordion.open = false;
    }
    if (els.recurrenceAccordion) {
      els.recurrenceAccordion.open = false;
    }

    render();
  } catch (error) {
    setMessage(error.message || "Could Not Save Transaction.", true);
  }
}

function enterEditMode(transaction) {
  state.editingId = transaction.id;
  els.description.value = transaction.description;
  els.amount.value = Number(transaction.amount);
  els.entryDate.value = transaction.date;
  els.entryType.value = transaction.type;
  populateParentCategories(transaction.type, normalizeLegacyParentCategory(transaction.parentCategory) || classifyCategory(transaction.description, transaction.type).parentCategory);
  populateSubcategories(transaction.type, els.parentCategorySelect.value, transaction.category);
  els.tripSelect.value = transaction.tripId || "";
  els.recurrenceFrequency.value = "none";
  els.recurrenceCount.value = "1";
  els.recurrenceCount.disabled = true;
  els.submitButton.textContent = "Update Transaction";
  els.cancelEditButton.hidden = false;
  setMessage("Editing Selected Transaction.", false);
}

function exitEditMode(options = {}) {
  state.editingId = null;
  els.submitButton.textContent = "Add Entry";
  els.cancelEditButton.hidden = true;
  resetForm();
  if (!options.keepMessage) {
    setMessage("Edit Canceled.", false);
  }
}

function resetForm() {
  els.form.reset();
  setDefaultDate();
  els.entryType.value = "expense";
  populateParentCategories("expense");
  els.tripSelect.value = "";
  if (els.tripAccordion) {
    els.tripAccordion.open = false;
  }
  els.recurrenceFrequency.value = "none";
  els.recurrenceCount.value = "1";
  els.recurrenceCount.disabled = true;
  if (els.recurrenceAccordion) {
    els.recurrenceAccordion.open = false;
  }
  suggestCategoryFromDescription();
}

async function onRecentAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const transaction = state.transactions.find((tx) => tx.id === id);
  if (!transaction) {
    return;
  }

  if (action === "edit") {
    enterEditMode(transaction);
    focusQuickAddWidget();
    return;
  }

  if (action === "delete") {
    const confirmed = await requestConfirm({
      title: "Delete Transaction",
      message: "Delete This Transaction?",
      confirmText: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Delete Failed");
      }

      state.transactions = state.transactions.filter((tx) => tx.id !== id);
      if (state.editingId === id) {
        exitEditMode({ keepMessage: true });
      }
      render();
      setMessage("Transaction Deleted.", false);
    } catch {
      setMessage("Could Not Delete Transaction.", true);
    }
  }
}

async function onMonthLogAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const transaction = state.transactions.find((tx) => tx.id === id);
  if (!transaction) {
    return;
  }

  if (action === "edit") {
    closeMonthLogModal();
    enterEditMode(transaction);
    focusQuickAddWidget();
    return;
  }

  if (action === "delete") {
    const confirmed = await requestConfirm({
      title: "Delete Transaction",
      message: "Delete This Transaction?",
      confirmText: "Delete",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Delete Failed");
      }

      state.transactions = state.transactions.filter((tx) => tx.id !== id);
      if (state.editingId === id) {
        exitEditMode({ keepMessage: true });
      }
      render();
      setMessage("Transaction Deleted.", false);
    } catch {
      setMessage("Could Not Delete Transaction.", true);
    }
  }
}

function focusQuickAddWidget() {
  const widgetCard = document.querySelector(".widget-card");
  if (widgetCard) {
    widgetCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  els.description.focus();
}

async function clearAllData() {
  const confirmReset = await requestConfirm({
    title: "Clear All Data",
    message: "This Clears All Saved Dashboard Data. Continue?",
    confirmText: "Clear Data",
    tone: "danger"
  });
  if (!confirmReset) {
    return;
  }

  try {
    const response = await apiFetch("/api/transactions", { method: "DELETE" });
    if (!response.ok) {
      throw new Error("Delete Failed");
    }

    state.transactions = [];
    render();
    setMessage("All Entries Removed.", false);
  } catch {
    setMessage("Could Not Clear Server Data.", true);
  }
}

function openImportFilePicker() {
  els.excelFile.click();
}

async function importFromFile() {
  const file = els.excelFile.files?.[0];
  if (!file) {
    return;
  }

  const payload = new FormData();
  payload.append("file", file);

  els.importButton.disabled = true;
  setImportMessage("Preparing Import Preview...", false);

  try {
    const response = await apiFetch("/api/import-preview", {
      method: "POST",
      body: payload
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "Import Failed");
    }

    state.importPreview = {
      token: result.token,
      fileName: result.fileName,
      headers: result.headers || [],
      mapping: result.mapping || {},
      summary: result.summary || {},
      previewRows: result.previewRows || []
    };

    openImportPreviewModal();
    els.excelFile.value = "";
    setImportMessage("Preview Ready. Confirm Import To Save Rows.", false);
  } catch (error) {
    setImportMessage(error.message || "Could Not Import File.", true);
    els.excelFile.value = "";
  } finally {
    els.importButton.disabled = false;
  }
}

function openImportPreviewModal() {
  if (!state.importPreview) {
    return;
  }

  renderImportPreviewModal();
  els.importPreviewModal.hidden = false;
}

function closeImportPreviewModal() {
  els.importPreviewModal.hidden = true;
  state.importPreview = null;
}

function onImportMappingChanged() {
  if (!state.importPreview) {
    return;
  }

  state.importPreview.mapping = getSelectedImportMapping();
}

function getSelectedImportMapping() {
  return {
    date: els.importMapDate.value,
    description: els.importMapDescription.value,
    amount: els.importMapAmount.value,
    type: els.importMapType.value,
    parentCategory: els.importMapParentCategory.value,
    category: els.importMapCategory.value,
    trip: els.importMapTrip.value
  };
}

function hydrateImportMapSelect(selectElement, headers, selectedValue) {
  const options = ['<option value="">Not Mapped</option>', ...headers.map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`)];
  selectElement.innerHTML = options.join("");
  if (selectedValue && headers.includes(selectedValue)) {
    selectElement.value = selectedValue;
  } else {
    selectElement.value = "";
  }
}

function renderImportPreviewModal() {
  const preview = state.importPreview;
  if (!preview) {
    return;
  }

  const headers = preview.headers || [];
  const mapping = preview.mapping || {};

  hydrateImportMapSelect(els.importMapDate, headers, mapping.date || "");
  hydrateImportMapSelect(els.importMapDescription, headers, mapping.description || "");
  hydrateImportMapSelect(els.importMapAmount, headers, mapping.amount || "");
  hydrateImportMapSelect(els.importMapType, headers, mapping.type || "");
  hydrateImportMapSelect(els.importMapParentCategory, headers, mapping.parentCategory || "");
  hydrateImportMapSelect(els.importMapCategory, headers, mapping.category || "");
  hydrateImportMapSelect(els.importMapTrip, headers, mapping.trip || "");

  if (els.importPreviewSubtitle) {
    const fileLabel = preview.fileName ? `File: ${preview.fileName}` : "Review Column Mapping And Rows Before Import";
    els.importPreviewSubtitle.textContent = fileLabel;
  }

  const summary = preview.summary || {};
  els.importPreviewSummary.innerHTML = `
    <p>Total Rows: <strong>${Number(summary.totalRows || 0)}</strong></p>
    <p>Ready: <strong>${Number(summary.readyRows || 0)}</strong></p>
    <p>Invalid: <strong>${Number(summary.invalidRows || 0)}</strong></p>
    <p>Dupes (Existing): <strong>${Number(summary.duplicateExistingRows || 0)}</strong></p>
    <p>Dupes (File): <strong>${Number(summary.duplicateFileRows || 0)}</strong></p>
  `;

  const previewRows = preview.previewRows || [];
  if (!previewRows.length) {
    els.importPreviewBody.innerHTML = '<tr><td colspan="9" class="empty-state">No Rows Available For Preview.</td></tr>';
    return;
  }

  els.importPreviewBody.innerHTML = previewRows.map((row) => {
    const statusClass = row.status === "ready"
      ? "preview-status-ready"
      : row.status === "invalid"
        ? "preview-status-invalid"
        : "preview-status-duplicate";

    const statusText = row.status === "ready"
      ? "Ready"
      : row.status === "invalid"
        ? "Invalid"
        : "Duplicate";

    return `
      <tr>
        <td>${escapeHtml(String(row.rowNumber || ""))}</td>
        <td>${escapeHtml(row.date || "-")}</td>
        <td>${escapeHtml(row.description || "-")}</td>
        <td>${escapeHtml(row.type ? toTitleCase(row.type) : "-")}</td>
        <td>${escapeHtml(row.parentCategory || "-")}</td>
        <td>${escapeHtml(row.category || "-")}</td>
        <td>${escapeHtml(row.tripName || "-")}</td>
        <td>${typeof row.amount === "number" ? formatMoney(row.amount) : "-"}</td>
        <td><span class="preview-status ${statusClass}">${escapeHtml(statusText)}${row.reason ? `: ${escapeHtml(row.reason)}` : ""}</span></td>
      </tr>
    `;
  }).join("");
}

async function commitImportPreview() {
  if (!state.importPreview?.token) {
    setImportMessage("Import Preview Is Missing. Please Upload Again.", true);
    closeImportPreviewModal();
    return;
  }

  const mapping = getSelectedImportMapping();
  if (!mapping.description || !mapping.amount) {
    setImportMessage("Description And Amount Mappings Are Required.", true);
    return;
  }

  els.confirmImportButton.disabled = true;
  setImportMessage("Importing Confirmed Rows...", false);

  try {
    const response = await apiFetch("/api/import-commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: state.importPreview.token,
        mapping,
        skipDuplicates: els.importSkipDuplicates.checked
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "Import Commit Failed");
    }

    await refreshTransactions();
    closeImportPreviewModal();
    setImportMessage(
      `Imported ${Number(result.importedCount || 0)} Row(s). Skipped ${Number(result.skippedCount || 0)} Row(s).`,
      false
    );
  } catch (error) {
    setImportMessage(error.message || "Could Not Commit Import.", true);
  } finally {
    els.confirmImportButton.disabled = false;
  }
}

function exportToCsv() {
  if (!state.transactions.length) {
    setMessage("No Data To Export Yet.", true);
    return;
  }

  // Fetch Excel export from server
  apiFetch("/api/export-excel")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Export failed");
      }
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "budget-pulse-export.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Excel Export Downloaded.", false);
    })
    .catch((error) => {
      console.error(error);
      setMessage("Export Failed. Please Try Again.", true);
    });
}

function exportBackupCsv() {
  // Fetch import-ready CSV backup from server.
  apiFetch("/api/export-backup-csv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Backup export failed");
      }
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "budget-pulse-backup.csv";
      link.click();
      URL.revokeObjectURL(url);
      setImportMessage("Backup CSV Downloaded.", false);
    })
    .catch((error) => {
      console.error(error);
      setImportMessage("Backup Export Failed. Please Try Again.", true);
    });
}

function quoteCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function render() {
  const monthTransactions = getTransactionsForActiveMonth();
  renderYearMetrics();
  renderKpis(monthTransactions);
  renderMonthSnapshot(monthTransactions);
  renderParentTotalsCards(monthTransactions);
  renderParentCategoryChart(monthTransactions);
  renderRecentEntries();
  renderMonthLog(monthTransactions);
  renderTripSummary();
  renderSavingsInsights();
}

function getYearToDateTransactions() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return state.transactions.filter((tx) => {
    const txDate = new Date(tx.date + "T00:00:00");
    return txDate >= yearStart && txDate <= now;
  });
}

function renderYearMetrics() {
  const ytdTransactions = getYearToDateTransactions();
  let ytdIncome = 0;
  let ytdSpending = 0;
  for (const tx of ytdTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      ytdIncome += amount;
    } else {
      ytdSpending += amount;
    }
  }
  const ytdNet = ytdIncome - ytdSpending;
  const ytdSavingsRate = ytdIncome > 0 ? Math.round((ytdNet / ytdIncome) * 100) : 0;

  els.yearNetValue.textContent = formatMoney(ytdNet);
  els.yearIncomeValue.textContent = formatMoney(ytdIncome);
  els.yearSpendingValue.textContent = formatMoney(ytdSpending);
  els.yearSavingsRateValue.textContent = `${ytdSavingsRate}%`;

  applyValueTone(els.yearIncomeValue);
  applyValueTone(els.yearSpendingValue);
  applyValueTone(els.yearNetValue, ytdNet >= 0 ? "positive" : "negative");
  applyValueTone(els.yearSavingsRateValue);
}

function renderKpis(monthTransactions) {
  let income = 0;
  let expenses = 0;

  for (const tx of monthTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      income += amount;
    } else {
      expenses += amount;
    }
  }

  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  els.balanceValue.textContent = formatMoney(net);
  els.incomeValue.textContent = formatMoney(income);
  els.expenseValue.textContent = formatMoney(expenses);
  els.savingsRateValue.textContent = `${Math.round(savingsRate)}%`;

  applyValueTone(els.incomeValue);
  applyValueTone(els.expenseValue);
  applyValueTone(els.balanceValue, net >= 0 ? "positive" : "negative");
  applyValueTone(els.savingsRateValue);
}

function getParentTotals(transactions) {
  const totals = {};
  const subTotals = {};

  for (const tx of transactions) {
    const parent = normalizeLegacyParentCategory(tx.parentCategory) || "Expenses";
    const sub = normalizeLegacyCategoryLabel(tx.category) || "Other";
    const amount = Number(tx.amount);

    totals[parent] = (totals[parent] || 0) + amount;

    if (!subTotals[parent]) {
      subTotals[parent] = {};
    }
    subTotals[parent][sub] = (subTotals[parent][sub] || 0) + amount;
  }

  return { totals, subTotals };
}

function getParentTotalCardClass(parentCategory) {
  const normalized = String(parentCategory || "").toLowerCase().trim();

  if (normalized === "income") {
    return "category-income";
  }

  if (normalized === "car") {
    return "category-car";
  }

  if (normalized === "girlfriend") {
    return "category-girlfriend";
  }

  if (normalized === "personal" || normalized === "personal expenses") {
    return "category-personal";
  }

  if (normalized === "expense" || normalized === "expenses") {
    return "category-expenses";
  }

  if (normalized === "travel") {
    return "category-travel";
  }

  return "";
}

function getParentCategoryChipClass(parentCategory) {
  const normalized = String(parentCategory || "").toLowerCase().trim();

  if (normalized === "income") {
    return "parent-chip-income";
  }

  if (normalized === "car") {
    return "parent-chip-car";
  }

  if (normalized === "girlfriend") {
    return "parent-chip-girlfriend";
  }

  if (normalized === "personal" || normalized === "personal expenses") {
    return "parent-chip-personal";
  }

  if (normalized === "expense" || normalized === "expenses") {
    return "parent-chip-expenses";
  }

  if (normalized === "travel") {
    return "parent-chip-travel";
  }

  return "parent-chip-default";
}

function getParentCategoryChartColor(parentCategory, index) {
  const normalized = String(parentCategory || "").toLowerCase().trim();

  if (normalized === "income") {
    return "#39ff88";
  }

  if (normalized === "car") {
    return "#33c7ff";
  }

  if (normalized === "girlfriend") {
    return "#ff4dff";
  }

  if (normalized === "personal" || normalized === "personal expenses") {
    return "#ff4f7d";
  }

  if (normalized === "expense" || normalized === "expenses") {
    return "#c44dff";
  }

  if (normalized === "travel") {
    return "#ff9f1a";
  }

  return CHART_COLORS[index % CHART_COLORS.length];
}

function getSubcategoryTooltipColor(index) {
  const palette = ["#ff4f7d", "#33c7ff", "#ff4dff", "#ff6a86", "#c44dff", "#ff9f1a", "#00f0ff", "#ffe45e"];
  return palette[index % palette.length];
}

function getOrCreateDonutTooltip() {
  let tooltipEl = document.getElementById("donutHoverMenu");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "donutHoverMenu";
    tooltipEl.className = "chart-hover-menu";
    document.body.appendChild(tooltipEl);
  }

  return tooltipEl;
}

function renderParentCategoryChart(monthTransactions) {
  const expenseTransactions = monthTransactions.filter((tx) => tx.type === "expense");
  const { totals, subTotals } = getParentTotals(expenseTransactions);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (state.charts.expenseCategory) {
    state.charts.expenseCategory.destroy();
  }

  if (!entries.length || !window.Chart) {
    return;
  }

  state.charts.expenseCategory = new Chart(els.expenseCategoryChart, {
    type: "doughnut",
    data: {
      labels: entries.map(([name]) => name),
      datasets: [{
        data: entries.map(([, total]) => total),
        backgroundColor: entries.map(([name], index) => getParentCategoryChartColor(name, index)),
        hoverOffset: 14,
        borderWidth: 1,
        borderColor: "#0f0f1a"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onHover(event, activeElements) {
        const target = event?.native?.target;
        if (target && target.style) {
          target.style.cursor = activeElements.length ? "pointer" : "default";
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, color: "#ece8ff" }
        },
        tooltip: {
          enabled: false,
          external(context) {
            const { chart, tooltip } = context;
            const tooltipEl = getOrCreateDonutTooltip();

            if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
              tooltipEl.style.opacity = "0";
              return;
            }

            const point = tooltip.dataPoints[0];
            const label = point.label || "Category";
            const total = Number(point.raw || 0);
            const parentColor = getParentCategoryChartColor(label, point.dataIndex || 0);

            const breakdown = Object.entries(subTotals[label] || {})
              .sort((a, b) => b[1] - a[1])
              .map(([name, amount], index) => {
                const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
                const color = getSubcategoryTooltipColor(index);
                return `<li><span class="hover-menu-dot" style="background:${color}"></span><span class="hover-menu-label">${escapeHtml(name)}</span><span class="hover-menu-value">${formatMoney(amount)} (${percent}%)</span></li>`;
              })
              .join("");

            tooltipEl.innerHTML = `<div class="hover-menu-title">${escapeHtml(label)}</div><div class="hover-menu-total"><span class="hover-menu-dot" style="background:${parentColor}"></span><span class="hover-menu-label">Total</span><span class="hover-menu-value">${formatMoney(total)}</span></div><div class="hover-menu-subtitle">Subcategories</div><ul class="hover-menu-list">${breakdown || '<li><span class="hover-menu-label">No Subcategory Data</span></li>'}</ul>`;

            const rect = chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = "1";
            tooltipEl.style.left = `${window.pageXOffset + rect.left + tooltip.caretX + 14}px`;
            tooltipEl.style.top = `${window.pageYOffset + rect.top + tooltip.caretY - 12}px`;
            tooltipEl.style.transform = "translateY(-50%)";
            tooltipEl.style.position = "absolute";
            tooltipEl.style.pointerEvents = "none";
            tooltipEl.style.zIndex = "50";
          }
        }
      }
    }
  });
}

function renderParentTotalsCards(monthTransactions) {
  const { totals } = getParentTotals(monthTransactions);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    els.parentTotalsGrid.innerHTML = '<p class="empty-state">No Data For This Month.</p>';
    return;
  }

  els.parentTotalsGrid.innerHTML = entries
    .map(([parent, total]) => `
      <article class="parent-total-card ${getParentTotalCardClass(parent)}">
        <p>${escapeHtml(parent)}</p>
        <h4>${formatMoney(total)}</h4>
      </article>
    `)
    .join("");
}

function renderMonthSnapshot(monthTransactions) {
  const { start } = getActiveMonthRange();
  const monthLabel = start.toLocaleString("en-US", { month: "long", year: "numeric" });
  els.activeMonthLabel.textContent = monthLabel;
  els.nextMonthButton.disabled = false;

  let income = 0;
  let expenses = 0;
  for (const tx of monthTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      income += amount;
    } else {
      expenses += amount;
    }
  }

  const net = income - expenses;
  els.monthSpendingValue.textContent = formatMoney(expenses);
  els.monthNetValue.textContent = formatMoney(net);
  els.netMetricCard.classList.toggle("net-positive", net >= 0);
  els.netMetricCard.classList.toggle("net-negative", net < 0);
}

function renderRecentEntries() {
  if (!state.transactions.length) {
    els.recentEntries.innerHTML = '<li class="empty-state">No Entries Yet. Add One From The Widget.</li>';
    return;
  }

  const latest = state.transactions.slice(0, 10);
  els.recentEntries.innerHTML = latest
    .map((tx) => {
      const normalizedParent = normalizeLegacyParentCategory(tx.parentCategory);
      const normalizedSubcategory = normalizeLegacyCategoryLabel(tx.category);
      const tripName = getTripNameById(tx.tripId) || "Unknown";
      return `
      <li class="recent-item">
        <div class="recent-chips">
          <span class="type-chip ${tx.type === "income" ? "type-income" : "type-expense"}">${escapeHtml(toTitleCase(tx.type))}</span>
          ${tx.type === "income" ? "" : `<span class="category-chip ${getParentCategoryChipClass(normalizedParent)}">${escapeHtml(normalizedParent || "Uncategorized")}</span>`}
        </div>
        <div class="recent-main">
          <strong>${escapeHtml(tx.description)}</strong>
          <div class="recent-meta">
            <span class="recent-date">${formatDateForDisplay(tx.date)}</span>
            ${tx.category ? `<span class="recent-subcategory">${escapeHtml(normalizedSubcategory)}</span>` : ""}
          </div>
        </div>
        ${tx.tripId ? `<span class="category-chip parent-chip-default recent-amount-trip">Trip: ${escapeHtml(tripName)}</span>` : ""}
        <span class="recent-amount">${tx.type === "income" ? "+" : "-"}${formatMoney(Number(tx.amount))}</span>
        <div class="item-actions">
          <button class="mini-btn edit-btn" data-action="edit" data-id="${escapeHtml(tx.id)}" type="button">Edit</button>
          <button class="mini-btn delete-btn" data-action="delete" data-id="${escapeHtml(tx.id)}" type="button">Delete</button>
        </div>
      </li>
    `;
    })
    .join("");
}

function openMonthLogModal() {
  els.monthLogModal.hidden = false;
}

function closeMonthLogModal() {
  els.monthLogModal.hidden = true;
  state.monthLogDeleteMode = false;
  state.monthLogSelectedIds.clear();
  render();
}

function toggleMonthLogDeleteMode() {
  state.monthLogDeleteMode = !state.monthLogDeleteMode;
  if (!state.monthLogDeleteMode) {
    state.monthLogSelectedIds.clear();
  }
  render();
}

function getFilteredMonthTransactions(monthTransactions) {
  return monthTransactions.filter((tx) => {
    const query = state.monthLogFilters.query.toLowerCase();
    const matchesQuery = !query || String(tx.description || "").toLowerCase().includes(query);
    const matchesType = state.monthLogFilters.type === "all" || tx.type === state.monthLogFilters.type;
    const matchesParent = state.monthLogFilters.parent === "all" || normalizeLegacyParentCategory(tx.parentCategory) === state.monthLogFilters.parent;
    const matchesSubcategory = state.monthLogFilters.subcategory === "all" || normalizeLegacyCategoryLabel(tx.category) === state.monthLogFilters.subcategory;
    return matchesQuery && matchesType && matchesParent && matchesSubcategory;
  });
}

function getOrderedMonthLogTransactions(monthTransactions) {
  return monthTransactions
    .slice()
    .sort((a, b) => parseDateOnly(b.date).valueOf() - parseDateOnly(a.date).valueOf());
}

function syncMonthLogSelection(visibleTransactions) {
  const visibleIds = new Set(visibleTransactions.map((tx) => tx.id));
  for (const selectedId of state.monthLogSelectedIds) {
    if (!visibleIds.has(selectedId)) {
      state.monthLogSelectedIds.delete(selectedId);
    }
  }
}

function updateMonthLogBulkUi(visibleTransactions) {
  if (!els.monthLogBulkActions || !els.monthLogDeleteModeButton || !els.monthLogDeleteSelectedButton || !els.monthLogSelectHeader) {
    return;
  }

  if (state.monthLogDeleteMode) {
    els.monthLogBulkActions.hidden = false;
    els.monthLogDeleteModeButton.textContent = "Cancel";
    els.monthLogSelectHeader.hidden = false;
  } else {
    els.monthLogBulkActions.hidden = true;
    els.monthLogDeleteModeButton.textContent = "Delete";
    els.monthLogSelectHeader.hidden = true;
  }

  const selectedCount = state.monthLogSelectedIds.size;
  const totalVisible = visibleTransactions.length;
  const canSelect = totalVisible > 0;

  els.monthLogDeleteSelectedButton.textContent = `Delete Selected (${selectedCount})`;
  els.monthLogDeleteSelectedButton.disabled = selectedCount === 0;
  els.monthLogSelectAllButton.disabled = !canSelect || selectedCount === totalVisible;
  els.monthLogDeselectAllButton.disabled = selectedCount === 0;
}

function selectAllMonthLogRows() {
  const visible = getOrderedMonthLogTransactions(getFilteredMonthTransactions(getTransactionsForActiveMonth()));
  state.monthLogSelectedIds = new Set(visible.map((tx) => tx.id));
  render();
}

function deselectAllMonthLogRows() {
  state.monthLogSelectedIds.clear();
  render();
}

function onMonthLogSelectionChanged(event) {
  const checkbox = event.target.closest("input[data-log-select-id]");
  if (!checkbox) {
    return;
  }

  const id = checkbox.dataset.logSelectId;
  if (!id) {
    return;
  }

  if (checkbox.checked) {
    state.monthLogSelectedIds.add(id);
  } else {
    state.monthLogSelectedIds.delete(id);
  }

  updateMonthLogBulkUi(getOrderedMonthLogTransactions(getFilteredMonthTransactions(getTransactionsForActiveMonth())));
}

async function deleteSelectedMonthLogRows() {
  const ids = [...state.monthLogSelectedIds];
  if (!ids.length) {
    return;
  }

  const confirmed = await requestConfirm({
    title: "Delete Selected Transactions",
    message: `Delete ${ids.length} Selected Transaction${ids.length === 1 ? "" : "s"}?`,
    confirmText: "Delete Selected",
    tone: "danger"
  });
  if (!confirmed) {
    return;
  }

  let deletedCount = 0;
  let failedCount = 0;

  for (const id of ids) {
    try {
      const response = await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Delete Failed");
      }

      deletedCount += 1;
      state.monthLogSelectedIds.delete(id);
      state.transactions = state.transactions.filter((tx) => tx.id !== id);
      if (state.editingId === id) {
        exitEditMode({ keepMessage: true });
      }
    } catch {
      failedCount += 1;
    }
  }

  if (deletedCount > 0) {
    state.monthLogDeleteMode = false;
    state.monthLogSelectedIds.clear();
  }

  render();

  if (failedCount === 0) {
    setMessage(`${deletedCount} Transaction${deletedCount === 1 ? "" : "s"} Deleted.`, false);
    return;
  }

  setMessage(`Deleted ${deletedCount}. Failed To Delete ${failedCount}.`, true);
}

function openTripSummaryModal() {
  els.tripSummaryModal.hidden = false;
  renderTripSummary();
}

function closeTripSummaryModal() {
  els.tripSummaryModal.hidden = true;
}

function onTripSummaryFilterChanged() {
  state.tripSummaryFilter.trip = els.tripSummaryTripFilter.value;
  renderTripSummary();
}

function renderTripSummary() {
  if (!els.tripSummaryBody || !els.tripSummaryTotals) {
    return;
  }

  const selectedTrip = state.tripSummaryFilter.trip;
  const tripTransactions = state.transactions
    .filter((tx) => {
      const cleanTripId = String(tx.tripId || "").trim();
      return cleanTripId && (selectedTrip === "all" || cleanTripId === selectedTrip);
    })
    .slice()
    .sort((a, b) => parseDateOnly(a.date).valueOf() - parseDateOnly(b.date).valueOf());

  if (!tripTransactions.length) {
    els.tripSummaryBody.innerHTML = '<tr><td colspan="6" class="empty-state">No Trip Transactions Found.</td></tr>';
    els.tripSummaryTotals.innerHTML = '<p>Total Spending: <strong>$0.00</strong></p>';
    if (els.tripSummarySubtitle) {
      els.tripSummarySubtitle.textContent = selectedTrip === "all"
        ? "All Trip Transactions Across Months"
        : "No Transactions For Selected Trip";
    }
    return;
  }

  let spending = 0;

  els.tripSummaryBody.innerHTML = tripTransactions
    .map((tx) => {
      const amount = Number(tx.amount);

      if (tx.type === "expense") {
        spending += amount;
      }

      return `
      <tr>
        <td>${formatDateForDisplay(tx.date)}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td>${escapeHtml(normalizeLegacyParentCategory(tx.parentCategory))}</td>
        <td>${escapeHtml(normalizeLegacyCategoryLabel(tx.category))}</td>
        <td>${escapeHtml(getTripNameById(tx.tripId) || "-")}</td>
        <td>${formatMoney(amount)}</td>
      </tr>
    `;
    })
    .join("");

  if (els.tripSummarySubtitle) {
    els.tripSummarySubtitle.textContent = selectedTrip === "all"
      ? "All Trip Transactions Across Months"
      : `Summary For ${getTripNameById(selectedTrip) || "Selected Trip"}`;
  }

  els.tripSummaryTotals.innerHTML = `
    <p>Total Spending: <strong>${formatMoney(spending)}</strong></p>
  `;
}

function renderMonthLog(monthTransactions) {
  const { start } = getActiveMonthRange();
  const monthLabel = start.toLocaleString("en-US", { month: "long", year: "numeric" });
  els.monthLogSubtitle.textContent = `Transactions For ${monthLabel}`;

  hydrateMonthLogFilterOptions(monthTransactions);

  const filteredMonthTransactions = getFilteredMonthTransactions(monthTransactions);
  const ordered = getOrderedMonthLogTransactions(filteredMonthTransactions);

  syncMonthLogSelection(ordered);
  updateMonthLogBulkUi(ordered);

  if (!filteredMonthTransactions.length) {
    const colCount = state.monthLogDeleteMode ? 8 : 7;
    els.monthLogBody.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">No Transactions In This Month.</td></tr>`;
    els.monthLogTotals.innerHTML = '<p>Total Income: $0.00</p><p>Total Spending: $0.00</p><p>Net: $0.00</p>';
    return;
  }

  els.monthLogBody.innerHTML = ordered
    .map((tx) => `
      <tr>
        ${state.monthLogDeleteMode ? `<td class="month-log-select-cell"><input type="checkbox" data-log-select-id="${escapeHtml(tx.id)}" ${state.monthLogSelectedIds.has(tx.id) ? "checked" : ""} /></td>` : ""}
        <td>${formatDateForDisplay(tx.date)}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td>${escapeHtml(toTitleCase(tx.type))}</td>
        <td>${escapeHtml(normalizeLegacyParentCategory(tx.parentCategory))}</td>
        <td>${escapeHtml(normalizeLegacyCategoryLabel(tx.category))}</td>
        <td>${formatMoney(Number(tx.amount))}</td>
        <td class="log-action-cell">
          <div class="log-action-buttons">
            <button class="mini-btn edit-btn" data-action="edit" data-id="${escapeHtml(tx.id)}" type="button">Edit</button>
            <button class="mini-btn delete-btn" data-action="delete" data-id="${escapeHtml(tx.id)}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  let income = 0;
  let spending = 0;
  for (const tx of filteredMonthTransactions) {
    if (tx.type === "income") {
      income += Number(tx.amount);
    } else {
      spending += Number(tx.amount);
    }
  }
  const net = income - spending;

  els.monthLogTotals.innerHTML = `
    <p>Total Income: <strong>${formatMoney(income)}</strong></p>
    <p>Total Spending: <strong>${formatMoney(spending)}</strong></p>
    <p class="${net >= 0 ? "log-net-positive" : "log-net-negative"}">Net: <strong>${formatMoney(net)}</strong></p>
  `;
}

function onMonthLogFiltersChanged() {
  state.monthLogFilters.query = els.monthLogSearch.value.trim();
  state.monthLogFilters.type = els.monthLogTypeFilter.value;
  state.monthLogFilters.parent = els.monthLogParentFilter.value;
  state.monthLogFilters.subcategory = els.monthLogSubcategoryFilter.value;
  render();
}

function resetMonthLogFilters() {
  state.monthLogFilters = {
    query: "",
    type: "all",
    parent: "all",
    subcategory: "all"
  };

  els.monthLogSearch.value = "";
  els.monthLogTypeFilter.value = "all";
  els.monthLogParentFilter.value = "all";
  els.monthLogSubcategoryFilter.value = "all";
  render();
}

function hydrateMonthLogFilterOptions(monthTransactions) {
  const uniqueParents = [...new Set(monthTransactions.map((tx) => normalizeLegacyParentCategory(tx.parentCategory)).filter(Boolean))].sort();
  const uniqueSubcategories = [...new Set(monthTransactions.map((tx) => normalizeLegacyCategoryLabel(tx.category)).filter(Boolean))].sort();

  const previousParent = state.monthLogFilters.parent;
  const previousSubcategory = state.monthLogFilters.subcategory;
  els.monthLogParentFilter.innerHTML = [
    '<option value="all">All</option>',
    ...uniqueParents.map((parent) => `<option value="${escapeHtml(parent)}">${escapeHtml(parent)}</option>`)
  ].join("");

  els.monthLogSubcategoryFilter.innerHTML = [
    '<option value="all">All</option>',
    ...uniqueSubcategories.map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`)
  ].join("");

  state.monthLogFilters.parent = uniqueParents.includes(previousParent) ? previousParent : "all";
  state.monthLogFilters.subcategory = uniqueSubcategories.includes(previousSubcategory) ? previousSubcategory : "all";

  els.monthLogSearch.value = state.monthLogFilters.query;
  els.monthLogTypeFilter.value = state.monthLogFilters.type;
  els.monthLogParentFilter.value = state.monthLogFilters.parent;
  els.monthLogSubcategoryFilter.value = state.monthLogFilters.subcategory;
}

function normalizeLegacyCategoryLabel(category) {
  return String(category || "").trim().toLowerCase() === "paycheck/salary" ? "Salary" : String(category || "");
}

function normalizeLegacyParentCategory(parentCategory) {
  return String(parentCategory || "").trim().toLowerCase() === "personal expenses" ? "Personal" : String(parentCategory || "");
}

function setMessage(message, isError) {
  if (formMessageTimeoutId) {
    clearTimeout(formMessageTimeoutId);
    formMessageTimeoutId = null;
  }

  els.formMessage.textContent = message;
  els.formMessage.style.color = isError ? "#ff4766" : "#35ff86";

  if (message) {
    formMessageTimeoutId = window.setTimeout(() => {
      els.formMessage.textContent = "";
      formMessageTimeoutId = null;
    }, 30000);
  }
}

function setImportMessage(message, isError) {
  if (!els.importMessage) {
    return;
  }

  if (importMessageTimeoutId) {
    clearTimeout(importMessageTimeoutId);
    importMessageTimeoutId = null;
  }

  els.importMessage.textContent = message;
  els.importMessage.style.color = isError ? "#ff4766" : "#35ff86";

  if (message) {
    importMessageTimeoutId = window.setTimeout(() => {
      if (!els.importMessage) {
        return;
      }
      els.importMessage.textContent = "";
      importMessageTimeoutId = null;
    }, 30000);
  }
}

async function getErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (data?.error) {
      return data.error;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }

  return fallback;
}

function applyValueTone(element, tone) {
  if (!element) {
    return;
  }

  element.classList.remove("value-income", "value-spending", "value-positive", "value-negative", "negative");

  if (tone === "income") {
    element.classList.add("value-income");
    return;
  }

  if (tone === "spending") {
    element.classList.add("value-spending");
    return;
  }

  if (tone === "positive") {
    element.classList.add("value-positive");
    return;
  }

  if (tone === "negative") {
    element.classList.add("value-negative");
  }
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateOnly(dateStr) {
  return new Date(`${String(dateStr || "").slice(0, 10)}T00:00:00`);
}

function formatDateForDisplay(dateStr) {
  const date = parseDateOnly(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();
