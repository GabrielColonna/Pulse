const { test, expect } = require("@playwright/test");

const categoryModel = {
  income: [
    { name: "Income", subcategories: [{ name: "", keywords: [] }] }
  ],
  expense: [
    { name: "Expenses", subcategories: [{ name: "Bills", keywords: [] }] }
  ]
};

async function mockDashboardApi(page, { needsOnboarding }) {
  let onboardingRequired = needsOnboarding;
  const transactions = [{
    id: "tx-1",
    description: "Test groceries",
    amount: 25,
    date: "2026-11-01",
    type: "expense",
    parentCategory: "Expenses",
    category: "Bills",
    createdAt: 1
  }];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let body;
    let status = 200;

    if (url.pathname === "/api/me") {
      body = {
        displayName: "Test User",
        isAdmin: false,
        needsOnboarding: onboardingRequired
      };
    } else if (url.pathname === "/api/login") {
      body = { displayName: "Test User" };
    } else if (url.pathname === "/api/category-model" && method === "GET") {
      body = categoryModel;
    } else if (url.pathname === "/api/category-model" && method === "PUT") {
      onboardingRequired = false;
      body = JSON.parse(request.postData() || "{}").model;
    } else if (url.pathname === "/api/trips") {
      body = [];
    } else if (url.pathname === "/api/transactions") {
      body = transactions;
    } else {
      body = {};
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });
}

async function unlockPrivacyGate(page, { needsOnboarding }) {
  const digits = page.locator(".privacy-pin-digit");
  if (await digits.count() === 0) {
    await expect(page.locator(needsOnboarding ? "#onboardingScreen" : ".app-shell")).toBeVisible();
    return;
  }
  await digits.nth(0).fill("0");
  await digits.nth(1).fill("3");
  await digits.nth(2).fill("0");
  await digits.nth(3).fill("7");
  await expect(page.locator("#privacyGate")).toBeHidden();
  await expect(page.locator(".app-shell")).toBeVisible();
}

test("onboarding enforces income before expenses and hides mobile navigation", async ({ page }) => {
  await mockDashboardApi(page, { needsOnboarding: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await unlockPrivacyGate(page, { needsOnboarding: true });

  const nav = page.locator("#mobileBottomNav");
  await expect(page.locator("#onboardingScreen")).toBeVisible();
  await expect(page.locator("[data-onboarding-type='income']")).toBeEnabled();
  await expect(page.locator("[data-onboarding-type='expense']")).toBeDisabled();
  await expect(page.locator("#finishOnboardingSetupButton")).toHaveText("Next: Expenses");
  await expect(nav).toHaveClass(/is-hidden/);

  await page.locator("[data-onboarding-sub-name='0:0']").fill("");
  await page.locator("#finishOnboardingSetupButton").click();
  await expect(page.locator("#onboardingSetupMessage")).toContainText("Add a name");
  await expect(page.locator("[data-onboarding-sub-name='0:0']")).toBeFocused();

  await page.locator("[data-onboarding-sub-name='0:0']").fill("Salary");
  await page.locator("#finishOnboardingSetupButton").click();
  await expect(page.locator("[data-onboarding-type='expense']")).toBeEnabled();
  await expect(page.locator("#onboardingScreenStep")).toHaveText("Expense setup");
  await expect(page.locator("#finishOnboardingSetupButton")).toHaveText("Save & Enter Pulse");

  await page.locator("#finishOnboardingSetupButton").click();
  await expect(page.locator("#dashboardTour")).toBeVisible();
  await expect(nav).toHaveClass(/is-hidden/);
  await page.locator("#dashboardTourSkipButton").click();
  await expect(nav).not.toHaveClass(/is-hidden/);
});

test("mobile Quick Add hides the bottom navigation and restores it on close", async ({ page }) => {
  await mockDashboardApi(page, { needsOnboarding: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await unlockPrivacyGate(page, { needsOnboarding: false });

  const nav = page.locator("#mobileBottomNav");
  await expect(nav).toBeVisible();
  await page.locator("#mobileQuickAddButton").click();
  await expect(page.locator(".app-shell")).toHaveClass(/quick-add-open/);
  await expect(nav).toHaveClass(/is-hidden/);
  await page.locator("#closeQuickAddButton").click();
  await expect(page.locator(".app-shell")).not.toHaveClass(/quick-add-open/);
  await expect(nav).not.toHaveClass(/is-hidden/);
});

test("mobile recent transactions can open an existing transaction for editing", async ({ page }) => {
  await mockDashboardApi(page, { needsOnboarding: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await unlockPrivacyGate(page, { needsOnboarding: false });

  await page.locator("[data-mobile-action='edit-transaction']").click();
  await expect(page.locator(".app-shell")).toHaveClass(/quick-add-open/);
  await expect(page.locator("#submitButton")).toHaveText("Update Transaction");
  await expect(page.locator("#description")).toHaveValue("Test groceries");
  await expect(page.locator("#amount")).toHaveValue("25");
});
