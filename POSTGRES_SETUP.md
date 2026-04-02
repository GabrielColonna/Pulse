# PostgreSQL Migration Guide

Your Pulse app has been migrated from SQLite to PostgreSQL. Here's what changed and how to deploy:

## Changes Made

1. **Database Driver**: Replaced `sqlite3` with `pg` (PostgreSQL client)
2. **SQL Syntax**: Updated all parameter placeholders from `?` to `$1, $2, $3...` (PostgreSQL style)
3. **Connection**: Now uses `DATABASE_URL` environment variable instead of local file
4. **Dependencies**: Updated `package.json`

## Local Development Setup

### Option 1: PostgreSQL locally (if you have it installed)

```bash
# Create a local database
createdb pulse

# Set environment variable
export DATABASE_URL="postgresql://localhost/pulse"
# OR on Windows:
set DATABASE_URL=postgresql://localhost/pulse

# Start the app
npm start
```

The app will automatically initialize the schema on first run.

### Option 2: Use Render's free PostgreSQL (Recommended)

1. Go to [render.com](https://render.com)
2. Create a new PostgreSQL database (free tier)
3. Copy the **Internal Database URL** from Render
4. Add to your `.env` file:
   ```
   DATABASE_URL=postgresql://user:password@host/database
   ```
5. Deploy your app to Render

## Environment Variables Needed

- **`DATABASE_URL`**: PostgreSQL connection string (from Render or local)
- **`PORT`**: (Optional) Server port, defaults to 4100
- **`CLIENT_ORIGINS`**: (Optional) CORS origins, comma-separated

## Data Migration

**Your existing SQLite data is NOT automatically migrated.** To bring over old data:

1. **Export from old SQLite setup**:
   - Use "Backup Data" → `budget-pulse-backup.csv`

2. **Import to new PostgreSQL**:
   - Upload the CSV using "Import Data" in the web UI
   - The app will auto-reconcile categories

## New Features with PostgreSQL

✅ **Persistent storage** - Data survives app restarts  
✅ **Scalable** - Can handle millions of transactions  
✅ **Secure** - Managed backups on Render

## Troubleshooting

If the app won't start:
- Check that `DATABASE_URL` is set correctly
- Ensure PostgreSQL server is running (if local)
- Check logs: `npm start 2>&1 | tee app.log`

If migrations fail:
- The app runs migrations automatically on startup
- Check database permissions if ALTER TABLE fails
- You may need to manually run `CREATE TABLE` statements
