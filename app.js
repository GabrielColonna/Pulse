const CATEGORY_MODEL = {
  income: [
    {
      name: "Income",
      subcategories: [
        { name: "Paycheck/Salary", keywords: ["paycheck", "salary", "payroll", "wage"] },
        { name: "Gambling", keywords: ["gamble", "bet", "casino"] },
        { name: "Reselling", keywords: ["resell", "sold", "marketplace", "ebay"] },
        { name: "Financial Aid", keywords: ["financial aid", "grant", "scholarship"] },
        { name: "Other Income", keywords: ["income", "bonus", "refund", "gift"] }
      ]
    }
  ],
  expense: [
    {
      name: "Personal Expenses",
      subcategories: [
        { name: "Food", keywords: ["food", "restaurant", "doordash", "ubereats", "eat"] },
        { name: "Entertainment / Activities", keywords: ["entertainment", "movie", "netflix", "spotify", "activity"] },
        { name: "Haircut", keywords: ["haircut", "barber", "salon"] },
        { name: "Soccer", keywords: ["soccer", "cleats", "league"] },
        { name: "Gaming", keywords: ["psn", "playstation", "gaming", "sony"] },
        { name: "Shopping", keywords: ["shopping", "amazon", "mall", "clothes"] },
        { name: "Other", keywords: ["personal", "toiletries"] }
      ]
    },
    {
      name: "Expenses",
      subcategories: [
        { name: "Memberships", keywords: ["membership", "subscription", "gym"] },
        { name: "Car Payments", keywords: ["car payment", "auto loan"] },
        { name: "Insurance", keywords: ["insurance", "premium"] },
        { name: "Groceries", keywords: ["grocery", "walmart", "costco", "aldi", "target"] },
        { name: "Investments", keywords: ["investment", "broker", "stock", "crypto"] },
        { name: "Losses", keywords: ["loss", "chargeback"] }
      ]
    },
    {
      name: "Car",
      subcategories: [
        { name: "Gas", keywords: ["gas", "fuel", "shell", "chevron"] },
        { name: "Oil Changes", keywords: ["oil"] },
        { name: "Repairs", keywords: ["repair", "maintenance", "mechanic"] },
        { name: "Tolls", keywords: ["toll"] },
        { name: "Parking", keywords: ["parking", "meter"] },
        { name: "Other", keywords: ["car wash", "registration", "dmv"] }
      ]
    },
    {
      name: "Travel",
      subcategories: [
        { name: "Hotel", keywords: ["hotel", "airbnb"] },
        { name: "Flights", keywords: ["flight", "airfare"] },
        { name: "Rental", keywords: ["rental", "rent car"] },
        { name: "Activities", keywords: ["activity", "tour", "ticket"] }
      ]
    },
    {
      name: "Girlfriend",
      subcategories: [
        { name: "Gifts", keywords: ["gift", "present"] },
        { name: "Dates", keywords: ["date", "date night"] },
        { name: "Other", keywords: ["gabby"] }
      ]
    },
    {
      name: "Personal",
      subcategories: [
        { name: "Entertainment / Activities", keywords: ["entertainment", "movie", "netflix", "spotify", "activity"] },
        { name: "Food", keywords: ["food", "restaurant", "doordash", "ubereats", "eat"] },
        { name: "Haircut", keywords: ["haircut", "barber", "salon"] },
        { name: "Soccer", keywords: ["soccer", "cleats", "league"] },
        { name: "Gaming", keywords: ["psn", "playstation", "gaming", "sony"] },
        { name: "Shopping", keywords: ["shopping", "amazon", "mall", "clothes"] },
        { name: "Other", keywords: ["personal", "toiletries"] }
      ]
    }
  ]
};

const CHART_COLORS = ["#b400ff", "#ff2bd6", "#35ff86", "#ff4766", "#7f5cff", "#00f0ff"];

const state = {
  transactions: [],
  editingId: null,
  monthOffset: 0,
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

const els = {
  form: document.getElementById("entryForm"),
  description: document.getElementById("description"),
  amount: document.getElementById("amount"),
  entryDate: document.getElementById("entryDate"),
  entryType: document.getElementById("entryType"),
  parentCategorySelect: document.getElementById("parentCategorySelect"),
  subcategorySelect: document.getElementById("subcategorySelect"),
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
  resetMonthLogFilters: document.getElementById("resetMonthLogFilters"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  excelFile: document.getElementById("excelFile"),
  importButton: document.getElementById("importButton"),
  importMessage: document.getElementById("importMessage")
};

async function init() {
  setDefaultDate();
  populateParentCategories("expense");
  wireEvents();
  suggestCategoryFromDescription();
  await refreshTransactions();
}

function wireEvents() {
  els.description.addEventListener("input", suggestCategoryFromDescription);
  els.entryType.addEventListener("change", onTypeChange);
  els.parentCategorySelect.addEventListener("change", onParentCategoryChange);
  els.form.addEventListener("submit", onSubmitEntry);
  els.cancelEditButton.addEventListener("click", exitEditMode);
  els.clearButton.addEventListener("click", clearAllData);
  els.exportButton.addEventListener("click", exportToCsv);
  els.importButton.addEventListener("click", openImportFilePicker);
  els.excelFile.addEventListener("change", importFromFile);
  els.recentEntries.addEventListener("click", onRecentAction);
  els.prevMonthButton.addEventListener("click", () => shiftMonth(1));
  els.nextMonthButton.addEventListener("click", () => shiftMonth(-1));
  els.openMonthLogButton.addEventListener("click", openMonthLogModal);
  els.closeMonthLogButton.addEventListener("click", closeMonthLogModal);
  els.monthLogModal.addEventListener("click", onModalBackdropClick);
  els.monthLogSearch.addEventListener("input", onMonthLogFiltersChanged);
  els.monthLogTypeFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.monthLogParentFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.monthLogSubcategoryFilter.addEventListener("change", onMonthLogFiltersChanged);
  els.resetMonthLogFilters.addEventListener("click", resetMonthLogFilters);
}

function onModalBackdropClick(event) {
  if (event.target === els.monthLogModal) {
    closeMonthLogModal();
  }
}

function shiftMonth(delta) {
  const next = state.monthOffset + delta;
  if (next < 0) {
    return;
  }

  state.monthOffset = next;
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
    ? { parentCategory: "Income", category: "Paycheck/Salary" }
    : { parentCategory: "Personal Expenses", category: "Food" };
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

  if (!description || Number.isNaN(amount) || amount <= 0 || !date || !parentCategory || !category) {
    setMessage("Please Enter All Fields With A Valid Amount.", true);
    return;
  }

  const payload = { description, amount, type, date, parentCategory, category };

  try {
    if (state.editingId) {
      const response = await fetch(`/api/transactions/${state.editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Update Failed");
      }

      const updated = await response.json();
      state.transactions = state.transactions.map((tx) => (tx.id === updated.id ? updated : tx));
      setMessage("Transaction Updated.", false);
      exitEditMode({ keepMessage: true });
    } else {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Create Failed");
      }

      const created = await response.json();
      state.transactions.unshift(created);
      setMessage("Transaction Saved.", false);
      resetForm();
    }

    render();
  } catch {
    setMessage("Could Not Save Transaction.", true);
  }
}

function enterEditMode(transaction) {
  state.editingId = transaction.id;
  els.description.value = transaction.description;
  els.amount.value = Number(transaction.amount);
  els.entryDate.value = transaction.date;
  els.entryType.value = transaction.type;
  populateParentCategories(transaction.type, transaction.parentCategory || classifyCategory(transaction.description, transaction.type).parentCategory);
  populateSubcategories(transaction.type, els.parentCategorySelect.value, transaction.category);
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
  setImportMessage("Importing File...", false);

  try {
    const response = await fetch("/api/import-excel", {
      method: "POST",
      body: payload
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || "Import Failed");
    }

    await refreshTransactions();
    els.excelFile.value = "";
    setImportMessage(
      `Imported ${result.importedCount} Row(s), Skipped ${result.skippedCount} Row(s).`,
      false
    );
  } catch (error) {
    setImportMessage(error.message || "Could Not Import File.", true);
  } finally {
    els.importButton.disabled = false;
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
  els.balanceValue.classList.toggle("negative", net < 0);
  els.incomeValue.textContent = formatMoney(income);
  els.expenseValue.textContent = formatMoney(expenses);
  els.savingsRateValue.textContent = `${Math.round(savingsRate)}%`;
}

function getParentTotals(transactions) {
  const totals = {};
  const subTotals = {};

  for (const tx of transactions) {
    const parent = tx.parentCategory || "Expenses";
    const sub = tx.category || "Other";
    const amount = Number(tx.amount);

    totals[parent] = (totals[parent] || 0) + amount;

    if (!subTotals[parent]) {
      subTotals[parent] = {};
    }
    subTotals[parent][sub] = (subTotals[parent][sub] || 0) + amount;
  }

  return { totals, subTotals };
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
        backgroundColor: entries.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
        borderWidth: 1,
        borderColor: "#0f0f1a"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, color: "#ece8ff" }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${formatMoney(context.raw)}`;
            },
            afterBody(items) {
              const label = items[0]?.label;
              if (!label || !subTotals[label]) {
                return "";
              }

              const list = Object.entries(subTotals[label])
                .sort((a, b) => b[1] - a[1])
                .map(([name, total]) => `- ${name}: ${formatMoney(total)}`);

              return ["Subcategories", ...list];
            }
          }
        }
      }
    }
  });
}

function renderParentTotalsCards(monthTransactions) {
  const expenseTransactions = monthTransactions.filter((tx) => tx.type === "expense");
  const { totals } = getParentTotals(expenseTransactions);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    els.parentTotalsGrid.innerHTML = '<p class="empty-state">No Expense Data For This Month.</p>';
    return;
  }

  els.parentTotalsGrid.innerHTML = entries
    .map(([parent, total]) => `
      <article class="parent-total-card">
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
  els.nextMonthButton.disabled = state.monthOffset === 0;

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
    .map((tx) => `
      <li class="recent-item">
        <span class="type-chip ${tx.type === "income" ? "type-income" : "type-expense"}">${escapeHtml(tx.type)}</span>
        <div class="recent-main">
          <strong>${escapeHtml(tx.description)}</strong>
          <span>${formatDateForDisplay(tx.date)} | ${escapeHtml(tx.parentCategory || "")}${tx.parentCategory ? " / " : ""}${escapeHtml(tx.category || "")}</span>
        </div>
        <span class="recent-amount">${formatMoney(Number(tx.amount))}</span>
        <div class="item-actions">
          <button class="mini-btn edit-btn" data-action="edit" data-id="${escapeHtml(tx.id)}" type="button">Edit</button>
          <button class="mini-btn delete-btn" data-action="delete" data-id="${escapeHtml(tx.id)}" type="button">Delete</button>
        </div>
      </li>
    `)
    .join("");
}

function openMonthLogModal() {
  els.monthLogModal.hidden = false;
}

function closeMonthLogModal() {
  els.monthLogModal.hidden = true;
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
    const matchesParent = state.monthLogFilters.parent === "all" || (tx.parentCategory || "") === state.monthLogFilters.parent;
    const matchesSubcategory = state.monthLogFilters.subcategory === "all" || (tx.category || "") === state.monthLogFilters.subcategory;
    return matchesQuery && matchesType && matchesParent && matchesSubcategory;
  });

  if (!filteredMonthTransactions.length) {
    els.monthLogBody.innerHTML = '<tr><td colspan="6" class="empty-state">No Transactions In This Month.</td></tr>';
    els.monthLogTotals.innerHTML = '<p>Total Income: $0.00</p><p>Total Spending: $0.00</p><p>Net: $0.00</p>';
    return;
  }

  const ordered = filteredMonthTransactions
    .slice()
    .sort((a, b) => parseDateOnly(a.date).valueOf() - parseDateOnly(b.date).valueOf());

  els.monthLogBody.innerHTML = ordered
    .map((tx) => `
      <tr>
        <td>${formatDateForDisplay(tx.date)}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td>${escapeHtml(toTitleCase(tx.type))}</td>
        <td>${escapeHtml(tx.parentCategory || "")}</td>
        <td>${escapeHtml(tx.category || "")}</td>
        <td>${formatMoney(Number(tx.amount))}</td>
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
  const uniqueParents = [...new Set(monthTransactions.map((tx) => tx.parentCategory).filter(Boolean))].sort();
  const uniqueSubcategories = [...new Set(monthTransactions.map((tx) => tx.category).filter(Boolean))].sort();

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

function setMessage(message, isError) {
  els.formMessage.textContent = message;
  els.formMessage.style.color = isError ? "#ff4766" : "#35ff86";
}

function setImportMessage(message, isError) {
  if (!els.importMessage) {
    return;
  }

  els.importMessage.textContent = message;
  els.importMessage.style.color = isError ? "#ff4766" : "#35ff86";
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
