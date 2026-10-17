# QR History Table Migration Guide

## Quick Fix

Your `qr_history` table is missing required columns. Run this migration to add them:

### Option 1: Using phpMyAdmin (Easiest)

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select database: `arms_system`
3. Click **SQL** tab
4. Open file: `server/database/migrate_qr_history.sql`
5. Copy all contents and paste into SQL tab
6. Click **Go**

### Option 2: Using MySQL Command Line

```bash
mysql -u root -p
USE arms_system;
SOURCE C:/arms-system/server/database/migrate_qr_history.sql;
```

Or copy and paste the SQL commands directly.

## What This Migration Adds

The migration safely adds these columns to `qr_history` table:
- ✅ `ticket_number` (VARCHAR(100) NOT NULL) - Required
- ✅ `type` (VARCHAR(50)) - Pass type (one-time/unlimited)
- ✅ `customer_name` (VARCHAR(255)) - Optional
- ✅ `classification` (VARCHAR(255)) - Ticket classification
- ✅ `generated_by` (INT NOT NULL) - Foreign key to users table
- ✅ `created_at` (TIMESTAMP) - Auto timestamp
- ✅ `ride` (VARCHAR(255)) - Optional, for future use

## After Migration

1. Restart your Node.js server
2. Try generating a QR code again
3. It should work now!

## Troubleshooting

### "Duplicate column" errors
- **Safe to ignore** - Means the column already exists
- The script will skip columns that already exist

### "Table doesn't exist"
- Run the full `schema.sql` first to create the table
- Then run this migration

### "Foreign key constraint fails"
- Make sure `users` table exists
- Make sure you have at least one user in the `users` table

## Verification

After running the migration, verify with:

```sql
DESCRIBE qr_history;
```

You should see all the columns listed above.

