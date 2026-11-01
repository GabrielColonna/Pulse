# Pulse Production Plan

## 1. Product thesis

Pulse is a personal financial memory and planning system. It helps people replace
spreadsheets without giving up control, context, or ownership of their data.

> **Leave the spreadsheet. Keep the control.**

### Why the name "Pulse"

Pulse is named for the product's human-centered approach to personal finance.
Financial tools should not make users feel removed from or dependent on an
opaque system to understand their own money. Pulse keeps the underlying data,
categories, context, and decisions close to the person using it, so they can
read their financial situation in their own terms and act with confidence.

Pulse should not try to become a cheaper copy of Rocket Money. Rocket Money is
account-centric and optimized for automation. Excel is flexible but labor-intensive.
Pulse wins by being personal, contextual, portable, and actionable.

## 2. Target customer

### Initial customer

Start with spreadsheet power users who already track money but are tired of
maintaining formulas, categories, and reports manually. They have existing data,
understand the problem, and have a clear reason to switch.

### Secondary customers

- Young professionals with irregular spending
- Travelers and people managing trips or events
- Couples tracking shared goals and life events
- Freelancers and side-hustle operators
- People who do not want to link bank accounts
- Students managing income, aid, food, transportation, and entertainment

### Customer promise

Within one session, a new user should be able to import their history, understand
one meaningful truth about their money, and create a next goal or action.

## 3. Positioning

### Core message

**Your money should make sense to you.**

Import your spreadsheet, customize your categories, and see exactly where your
money is going.

### Supporting messages

- Your spreadsheet got you this far. Pulse is what comes next.
- Track money in the categories and moments that matter to your life.
- Turn spending history into decisions, not just charts.
- Bring your data with you; do not start over.
- Your financial data should be portable and understandable.

### Competitive distinction

| Alternative | Strength | Pulse's response |
| --- | --- | --- |
| Excel/spreadsheets | Flexible and familiar | Keep the flexibility while removing repetitive work |
| Rocket Money | Automated account aggregation and savings discovery | Provide personal context, life-event tracking, and user control |
| Generic budgeting apps | Simple standardized categories | Let each user define the language and structure of their life |

Pulse should not lead with technical implementation or a long feature list.
Every screen and marketing message should communicate an outcome:

- Know where your money went this month.
- Find the true cost of a trip, event, or project.
- Stop wondering why your account is empty.
- Make a plan based on actual spending.

## 4. Product principles

1. **Fast before comprehensive.** Adding a transaction must be faster than opening
   Excel.
2. **Personal over generic.** Categories, rules, goals, and summaries should fit
   the user.
3. **Action over reporting.** Every important insight should suggest a next step.
4. **Portable by default.** Users can import, export, back up, and delete their data.
5. **Trust is a feature.** Explain storage, security, privacy, and recovery clearly.
6. **Context creates retention.** Trips, events, projects, and goals make history
   meaningful.
7. **Progressive complexity.** Show value before asking users to configure the system.

## 5. Current foundation

Pulse already provides the foundation for this strategy:

- Quick Add transaction entry
- Per-user categories and subcategories
- Keyword-based auto-categorization
- Excel/CSV import preview and commit
- Excel export and CSV backup
- Trip tagging and summaries
- Savings goals
- Monthly and yearly summaries
- Cross-month transaction search
- Guided first-login setup
- Local SQLite storage

The current implementation should be treated as the foundation, not the finished
product. The next work should improve the core loop and first-use value before
adding a large number of unrelated features.

## 6. Core product loop

1. Capture a transaction quickly.
2. Categorize it in the user's language.
3. See the pattern or life event it belongs to.
4. Compare actual spending with a goal or plan.
5. Decide what to change.
6. Return to track progress.

The product is successful when users return because Pulse helped them make a
decision, not merely because it stored another transaction.

## 7. Production roadmap

### Phase 0: Production foundation

**Objective:** Make the existing experience safe, reliable, and understandable.

Deliverables:

- Replace production SQLite persistence with managed durable storage where required.
- Define authentication, session, authorization, and account recovery behavior.
- Document encryption, data retention, backups, export, and permanent deletion.
- Add structured error handling and user-visible failure states.
- Add automated tests for authentication, transactions, imports, categorization,
  trips, goals, and exports.
- Add database migrations, backup/restore procedures, health monitoring, and logs.
- Remove debug-only behavior before production release.
- Verify responsive mobile behavior and installable PWA behavior.

Release gate:

- A user can trust that data is persisted, recoverable, exportable, and deletable.
- A failed request never appears to succeed.
- Critical workflows have repeatable automated coverage.

### Phase 1: The spreadsheet escape hatch

**Objective:** Make switching from Excel obvious and low-risk.

Deliverables:

- Guided import wizard with sample data and clear column mapping.
- Preview, validation, duplicate detection, and correction before commit.
- Merchant normalization and suggested categories.
- Import summary showing records added, skipped, and needing review.
- One-click export and backup confirmation.
- Migration checklist for users bringing multiple years of history.
- A post-import “Your first insight” screen showing spending totals, top categories,
  trends, and any tagged life events.

Release gate:

- A typical user can import an existing spreadsheet without documentation.
- Imported totals reconcile with the source file.
- The user reaches a useful insight during the first session.

### Phase 2: Make Quick Add a daily habit

**Objective:** Make manual capture faster than spreadsheet maintenance.

Deliverables:

- Merchant and category suggestions based on prior behavior.
- Remember the last category and common transaction patterns.
- Natural-language entry such as “$42 at Publix for groceries.”
- Keyboard-first and mobile-first entry.
- Recurring transaction shortcuts.
- Bulk edit, duplicate detection, and undo after save.
- Offline entry with safe synchronization when supported by the deployment model.
- Optional receipt attachment.

Release gate:

- Returning users can record a normal transaction with minimal interaction.
- Suggestions are explainable and easy to correct.
- Corrections improve future suggestions without silently changing history.

### Phase 3: The life-event ledger

**Objective:** Create Pulse's memorable signature feature.

Deliverables:

- A reusable ledger for trips, events, projects, and other life moments.
- Budget, live total, remaining amount, and planned-versus-actual views.
- Transaction tagging from Quick Add, imports, and the transaction log.
- Filters by date, category, and participant where appropriate.
- Clean shareable/exportable summaries.
- Templates for travel, moving, weddings, holidays, car ownership, and side projects.

Release gate:

- A user can create an event, tag transactions, and understand its total without
  leaving the workflow.
- The feature works across months and remains useful after the event ends.

### Phase 4: Turn reporting into planning

**Objective:** Make Pulse answer “what should I do next?”

Deliverables:

- Category spending targets and monthly limits.
- Pace warnings before a category is exceeded.
- Upcoming recurring expense view.
- Safe-to-spend estimate with transparent assumptions.
- Savings goal projections and required monthly contributions.
- Month-over-month and year-over-year comparisons.
- “Spending experiments,” such as reducing dining out by a chosen amount.
- Recommendations based on user-confirmed patterns, never unexplained claims.

Release gate:

- Every major insight includes a clear action or decision.
- Calculations are transparent and reconcile with transaction data.
- Users can dismiss, correct, or disable recommendations.

### Phase 5: Trust, retention, and distribution

**Objective:** Make privacy and progress reasons to stay with Pulse.

Deliverables:

- A plain-language privacy center showing where data is stored and who can access it.
- Full export, account deletion, and backup verification flows.
- Optional cloud backup with explicit user consent.
- Progress summaries showing goals, habits, and improvements over time.
- Referral/shareable reports that do not expose private data by default.
- Landing page and onboarding focused on replacing Excel, not listing features.
- Lightweight feedback capture tied to failed or confusing workflows.

Release gate:

- Users understand the privacy model without contacting support.
- A deleted account is actually deleted according to the documented policy.
- The product can acquire users without relying on generic budgeting claims.

## 8. Prioritized backlog

### P0: Must have before production positioning

- Durable production persistence and migration plan
- Authentication and authorization review
- Data export, backup, restore, and deletion guarantees
- Import reconciliation and duplicate handling
- Critical workflow test suite
- Clear loading, empty, validation, and error states
- Mobile Quick Add usability pass
- Remove debug logging and development-only defaults

### P1: Highest-value product improvements

- Guided spreadsheet migration wizard
- Post-import first-insight experience
- Merchant/category suggestions
- Recurring transaction shortcuts
- Undo and bulk editing
- Life-event ledger generalized beyond trips
- Category targets and pace warnings
- Transparent savings goal projections

### P2: Differentiation and retention

- Natural-language Quick Add
- Offline capture and synchronization
- Receipt attachments
- Safe-to-spend view
- Spending experiments
- Privacy center
- Optional cloud backup
- Shareable event summaries
- User feedback and analytics instrumentation

### Deliberately defer

- Competing directly with bank subscription cancellation services
- Large recommendation catalogs
- Social feeds or public financial profiles
- Complex investment advice
- Feature expansion that does not improve the core capture-to-decision loop

## 9. Success metrics

Measure outcomes, not page views.

### Activation

- Percentage of new users who import or add their first transaction
- Time from account creation to first useful insight
- Percentage who create a goal, trip, or life-event ledger
- Import completion rate and import error rate

### Habit

- Transactions added per active user per week
- Weekly and monthly returning users
- Percentage of transactions categorized automatically or with one correction
- Median time to add a transaction

### Value

- Percentage of users who view a decision-oriented insight
- Goals created and goals with recorded progress
- Life-event ledgers created and completed
- Export/backup usage
- User-reported confidence in understanding spending

### Quality and trust

- Failed request rate
- Data reconciliation failures
- Duplicate transaction rate
- Import correction rate
- Support issues involving missing or unexpected data
- Backup and restore success rate

Do not optimize for retention by making the app noisy. A useful weekly return is
more valuable than compulsive notifications.

## 10. Privacy and security requirements

Before marketing Pulse as private or local-first, document and verify:

- Where transaction data is stored in each deployment mode
- Whether administrators or service providers can access it
- Encryption in transit and at rest
- Session and PIN behavior
- Account recovery and device-loss behavior
- Backup retention and restore process
- Full export format
- Permanent deletion scope and timing
- Audit logging for administrative access

The privacy promise must match the implementation. Avoid vague claims such as
"completely private" unless they are technically and operationally true.

## 11. Development workflow

Every feature should include:

1. The user problem and target customer.
2. The smallest workflow that proves value.
3. Data and privacy implications.
4. Loading, empty, validation, and failure states.
5. Automated tests for the measurable behavior.
6. A release metric and a rollback or recovery plan.

Prioritize work that improves the core loop or removes a switching barrier. Before
starting a new feature, ask:

- Does this help users leave Excel?
- Does this provide context Rocket Money does not?
- Does this help users make a decision?
- Does this improve trust or reduce friction?
- Can the result be explained in one sentence?

If the answer is no to all five, defer it.

## 12. Short-term execution sequence

The recommended next sequence is:

1. Production foundation and data guarantees.
2. Spreadsheet migration wizard and first-insight experience.
3. Quick Add speed and suggestion improvements.
4. Generalized life-event ledger.
5. Targets, pacing, and actionable planning.
6. Privacy center, retention, and distribution.

The next milestone is not “add more dashboard features.” It is:

> A new user imports their spreadsheet, understands one meaningful truth about
> their money, creates a goal, and returns because Pulse helped them make a decision.
