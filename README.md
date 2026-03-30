# Budget Pulse Dashboard

Budget Pulse is a full-stack personal finance dashboard with:

- Quick Add transaction entry
- Auto-categorization by keyword rules
- Import preview and commit from Excel
- Export to Excel and backup CSV
- Trip tagging and summaries
- Local SQLite storage

## Run Locally

1. Install dependencies:
  - `npm install`
2. Copy env template (optional for local):
  - `copy .env.example .env`
3. Start server:
  - `npm start`
4. Open:
  - `http://localhost:4100`

Local data is stored in `budget.db`.

## Environment Variables

Use `.env` (or host env settings) for runtime config:

- `PORT`: server port (defaults to `4100`)
- `CLIENT_ORIGINS`: comma-separated allowed frontend origins for CORS
  - Example: `https://pulse-ui.pages.dev,https://www.yourdomain.com`
  - Use `*` only for temporary testing

## Free Deployment Paths

### Option A: Single Service (Easiest)

Deploy the whole app (frontend + backend) as one free Node web service on Render.

1. Push this repo to GitHub.
2. In Render, create a **Web Service** from the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Set env vars:
  - `PORT` is managed by Render automatically.
  - `CLIENT_ORIGINS` can stay empty for same-origin deployment.
6. Deploy and open your Render URL.

This keeps all features working with no frontend/backend split.

### Option B: Static Frontend + Separate Backend

If you host `index.html`/`app.js`/`styles.css` on a static host (Cloudflare Pages, GitHub Pages, Netlify), keep backend on a Node host.

1. Deploy backend (Render web service).
2. Set backend `CLIENT_ORIGINS` to your static site URL.
3. In `config.js`, set:
  - `window.__PULSE_API_BASE__ = "https://your-backend-domain.com";`
4. Deploy static frontend files.

Frontend now sends API calls to that backend base URL.

## Render Blueprint File

This repo includes `render.yaml` for Render blueprint-style setup.

## Health Check

Backend health endpoint:

- `GET /api/health` returns `{ "status": "ok" }`

## Data Persistence Note

Current storage is SQLite (`budget.db`). On free cloud runtimes, local disk persistence can be limited depending on provider lifecycle. For durable production persistence, migrate DB to a managed Postgres provider and update server queries accordingly.

## Customize Classification

Edit rule sets in:

- `app.js`
- `server.js`
