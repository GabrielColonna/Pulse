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

const state = {
  transactions: [],
  trips: [],
  editingId: null,
  monthOffset: 0,
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

const els = {
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
  resetMonthLogFilters: document.getElementById("resetMonthLogFilters"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  backupButton: document.getElementById("backupButton"),
  excelFile: document.getElementById("excelFile"),
  importButton: document.getElementById("importButton"),
  importMessage: document.getElementById("importMessage")
};

async function init() {
  hydrateSidebarState();
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
  els.closeTripSummaryButton.addEventListener("click", closeTripSummaryModal);
  els.monthLogModal.addEventListener("click", onModalBackdropClick);
  els.tripSummaryModal.addEventListener("click", onModalBackdropClick);
  els.importPreviewModal.addEventListener("click", onModalBackdropClick);
  els.closeImportPreviewButton.addEventListener("click", closeImportPreviewModal);
  els.cancelImportPreviewButton.addEventListener("click", closeImportPreviewModal);
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
    const response = await fetch("/api/trips");
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
  const rawName = window.prompt("Enter A New Trip Name:", "");
  const name = String(rawName || "").trim();
  if (!name) {
    setImportMessage("Trip Creation Canceled.", false);
    return;
  }

  try {
    const response = await fetch("/api/trips", {
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
  }
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
    const response = await fetch("/api/transactions");
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
      const response = await fetch(`/api/transactions/${state.editingId}`, {
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
      const response = await fetch("/api/transactions", {
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
    const confirmed = window.confirm("Delete This Transaction?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
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
    const confirmed = window.confirm("Delete This Transaction?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
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
  const confirmReset = window.confirm("This Clears All Saved Dashboard Data. Continue?");
  if (!confirmReset) {
    return;
  }

  try {
    const response = await fetch("/api/transactions", { method: "DELETE" });
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
    const response = await fetch("/api/import-preview", {
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
    const response = await fetch("/api/import-commit", {
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
  fetch("/api/export-excel")
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
  fetch("/api/export-backup-csv")
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

  const filteredMonthTransactions = monthTransactions.filter((tx) => {
    const query = state.monthLogFilters.query.toLowerCase();
    const matchesQuery = !query || String(tx.description || "").toLowerCase().includes(query);
    const matchesType = state.monthLogFilters.type === "all" || tx.type === state.monthLogFilters.type;
    const matchesParent = state.monthLogFilters.parent === "all" || normalizeLegacyParentCategory(tx.parentCategory) === state.monthLogFilters.parent;
    const matchesSubcategory = state.monthLogFilters.subcategory === "all" || normalizeLegacyCategoryLabel(tx.category) === state.monthLogFilters.subcategory;
    return matchesQuery && matchesType && matchesParent && matchesSubcategory;
  });

  if (!filteredMonthTransactions.length) {
    els.monthLogBody.innerHTML = '<tr><td colspan="7" class="empty-state">No Transactions In This Month.</td></tr>';
    els.monthLogTotals.innerHTML = '<p>Total Income: $0.00</p><p>Total Spending: $0.00</p><p>Net: $0.00</p>';
    return;
  }

  const ordered = filteredMonthTransactions
    .slice()
    .sort((a, b) => parseDateOnly(b.date).valueOf() - parseDateOnly(a.date).valueOf());

  els.monthLogBody.innerHTML = ordered
    .map((tx) => `
      <tr>
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
