# Budget Pulse Product Roadmap

## Purpose
This roadmap turns Budget Pulse into a more complete personal finance product while keeping the app simple, fast, and local-first.

## Product Goals

1. Reduce manual work in daily tracking.
2. Improve confidence in balances and reports.
3. Make imports safer and easier.
4. Support growth from single-user use to shared household use.

## Success Metrics

- Import success rate: > 95% rows mapped on first attempt.
- Manual categorization effort: reduce by 50%.
- Weekly active usage: increase by 30%.
- Data safety: 0 accidental permanent data losses.

## Phase 1: Quick Wins (1-2 weeks)

### 1) Advanced Search and Filters
Add flexible transaction filtering by date, amount range, category, merchant, income/expense type, and free-text notes.

Why it matters:
- Faster troubleshooting of spending anomalies.
- Better trust in totals and trends.

Implementation notes:
- Add filter controls in the dashboard header.
- Apply filters to both recent transactions and chart inputs.
- Support clear/reset filters.

Definition of done:
- Filtering updates list/cards/charts consistently.
- Filter state is visible and easy to clear.

### 2) Import Preview and Validation
Add a pre-import review screen before writing rows to SQLite.

Why it matters:
- Prevents bad imports and duplicate data.
- Lets users correct mapping before committing.

Implementation notes:
- Parse workbook, show detected headers, and preview first 20 rows.
- Let user map Date/Description/Amount/Type/Category columns manually if needed.
- Detect likely duplicates (same date + amount + normalized description).
- Provide import summary: inserted, skipped, failed.

Definition of done:
- Import can be canceled safely.
- User sees clear error reasons for failed rows.

### 3) Data Backup and Restore
Add one-click backup export and restore for SQLite data.

Why it matters:
- Protects against accidental clear/delete operations.
- Reduces fear around trying new features.

Implementation notes:
- Add API endpoints for backup download and restore upload.
- Use timestamped file naming.
- Confirm restore with explicit warning.

Definition of done:
- Backup can be downloaded and restored on a fresh app instance.
- Restore operation logs before/after row counts.

## Phase 2: Core Finance Features (2-4 weeks)

### 4) Monthly Budgets by Category
Add budget targets per category with monthly tracking.

Why it matters:
- Helps with planning and spending control.

Implementation notes:
- New table for category budgets by month.
- UI: budget setup modal + budget progress panel.
- Show status: under budget, near limit, over budget.

Definition of done:
- Budget values persist and update when month changes.
- Over-budget categories are clearly highlighted.

### 5) Recurring Transactions
Create rule-based recurring entries (weekly/monthly).

Why it matters:
- Eliminates repetitive data entry for fixed bills/income.

Implementation notes:
- Recurrence fields: frequency, start date, optional end date, next run date.
- Job runs at app start and daily to generate due entries.
- Generated transactions are traceable to the rule.

Definition of done:
- No duplicate generation for same period.
- Rules can be paused/resumed/deleted.

### 6) Split Transactions
Allow a single purchase to be distributed across multiple categories.

Why it matters:
- Improves reporting accuracy for mixed purchases.

Implementation notes:
- Parent transaction with child split lines.
- Validation: split totals must equal parent amount.
- Reporting uses split lines for category aggregation.

Definition of done:
- Chart/category totals reflect splits correctly.
- Edit flow supports both split and non-split transactions.

## Phase 3: Insights and Personalization (3-5 weeks)

### 7) Rule Editor in Settings
Move category keyword rules from code into a configurable UI.

Why it matters:
- Non-technical users can maintain classification logic.

Implementation notes:
- Add `category_rules` table.
- Priority ordering and conflict handling.
- Test mode to evaluate a description before saving rule.

Definition of done:
- New rules take effect immediately.
- Existing hardcoded defaults are migrated automatically.

### 8) Smart Insights and Alerts
Add monthly insights for major changes and unusual spending.

Why it matters:
- Turns static tracking into actionable guidance.

Implementation notes:
- Detect month-over-month spikes by category.
- Surface top 3 biggest changes and likely causes.
- Show alert cards on dashboard.

Definition of done:
- Alerts are explainable, not random noise.
- Users can dismiss or snooze alerts.

### 9) Savings Goals
Track progress toward custom goals (emergency fund, travel, etc.).

Why it matters:
- Connects spending behavior to meaningful outcomes.

Implementation notes:
- Goals table with target amount and target date.
- Progress based on contribution transactions.
- Goal progress widget and timeline projection.

Definition of done:
- Progress updates automatically with new entries.
- Goal completion status is clearly shown.

## Phase 4: Multi-User and Platform Maturity (4-8 weeks)

### 10) Multi-User Profiles and Audit Trail
Support shared usage with attribution and change history.

Why it matters:
- Enables family/partner collaboration safely.

Implementation notes:
- Add users table and `created_by`/`updated_by` fields.
- Basic local auth (PIN or password).
- Transaction history/audit logs for edits/deletes.

Definition of done:
- Every change is attributable to a profile.
- Audit timeline is filterable and readable.

### 11) PWA and Mobile Optimization
Make the app installable with improved phone workflows.

Why it matters:
- Encourages daily quick-add from mobile.

Implementation notes:
- Add web app manifest and service worker.
- Responsive redesign for quick add and list screens.
- Offline queue for quick entries with sync on reconnect.

Definition of done:
- App can be installed on phone/desktop.
- Core entry flow works in unstable connectivity.

### 12) Quality and Test Automation
Add test coverage for data-critical behavior.

Why it matters:
- Prevents regressions as feature count grows.

Implementation notes:
- API tests for import, CRUD, and monthly totals.
- Seeded test database fixtures.
- CI checks for pull requests.

Definition of done:
- Critical flows have automated tests.
- Test suite runs in CI on each change.

## Recommended Build Order

1. Search and filters.
2. Import preview and duplicate handling.
3. Backup and restore.
4. Budgets.
5. Recurring transactions.
6. Split transactions.
7. Rule editor UI.
8. Insights and savings goals.
9. Multi-user and PWA.
10. Test automation hardening throughout.

## Risks and Mitigations

- Risk: Duplicate or corrupted imports.
  - Mitigation: preview, strict validation, idempotency checks.
- Risk: Reporting mismatch after split transactions.
  - Mitigation: single reporting query path with tests.
- Risk: Schema changes break existing users.
  - Mitigation: versioned migrations and backup prompts.

## Immediate Next Sprint (Suggested)

1. Implement advanced filters.
2. Implement import preview with manual mapping.
3. Add backup/restore actions.
4. Add API tests for import + balances.

This sprint will deliver the highest user value with the lowest complexity increase.
