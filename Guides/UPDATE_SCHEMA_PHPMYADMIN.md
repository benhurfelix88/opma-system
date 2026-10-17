# How to Update schema.sql in phpMyAdmin

This guide will help you update your existing database to match the latest `schema.sql` without losing any data.

## ⚠️ Important Notes

- **Your existing data will be preserved** - this migration only adds missing columns and constraints
- **Backup your database first** (recommended but not required for this safe migration)
- The migration script checks if columns exist before adding them, so it's safe to run multiple times

## Step-by-Step Instructions

### Step 1: Open phpMyAdmin

1. Make sure XAMPP/WAMP is running (both Apache and MySQL services should be active)
2. Open your web browser
3. Navigate to: `http://localhost/phpmyadmin`
4. Login with:
   - **Username**: `root`
   - **Password**: (leave blank, or enter your MySQL password if you set one)

### Step 2: Select Your Database

1. In the left sidebar, click on your database name: `arms_system`
2. If you don't see `arms_system`, you may need to create it first (see troubleshooting below)

### Step 3: Open SQL Tab

1. Click on the **"SQL"** tab at the top of the page
2. You should see a large text area where you can enter SQL commands

### Step 4: Run the Migration Script

**Option A: Use the Migration Script (Recommended)**

1. Open the file `server/database/migrate_latest_schema.sql` in a text editor
2. Copy **ALL** the contents of that file (Ctrl+A, then Ctrl+C)
3. Paste it into the SQL text area in phpMyAdmin
4. Click the **"Go"** button at the bottom right

**Option B: Import the Full schema.sql (Only if database is empty or you want to start fresh)**

1. Click on the **"Import"** tab at the top
2. Click **"Choose File"** button
3. Select `server/database/schema.sql`
4. Click **"Go"** at the bottom

⚠️ **Warning**: Option B will only work if your tables don't exist yet, or if you want to recreate them (which may lose data).

### Step 5: Verify the Update

After running the migration, you should see success messages. Then verify:

1. **Check ticket_classifications table:**
   - Click on `ticket_classifications` in the left sidebar
   - Click the **"Structure"** tab
   - Verify these columns exist:
     - ✅ `description` (TEXT)
     - ✅ `age_limit` (VARCHAR(255))
     - ✅ `height_limit` (VARCHAR(255))
     - ✅ `restrictions` (TEXT)

2. **Check ticket_records table:**
   - Click on `ticket_records` in the left sidebar
   - Click the **"Structure"** tab
   - Verify these columns exist:
     - ✅ `ride_id` (INT)
     - ✅ `ride_name` (VARCHAR(255))
     - ✅ `type` (VARCHAR(50) NOT NULL)
     - ✅ `scan_count` (INT)
   - Click the **"Structure"** tab → Scroll down to see indexes
   - Verify these indexes exist:
     - ✅ `idx_ride_id`
     - ✅ `idx_ride_name`
     - ✅ `idx_type`
   - Click the **"Structure"** tab → Scroll to see constraints
   - Verify this constraint exists:
     - ✅ `unique_ticket_ride_one_time` (UNIQUE on ticket_number, ride, type)

3. **Check qr_history table:**
   - Click on `qr_history` in the left sidebar
   - Click the **"Structure"** tab
   - Verify `type` column is NOT NULL with DEFAULT 'one-time'
   - Verify indexes exist: `idx_type`, `idx_classification`

4. **Check rides table:**
   - Click on `rides` in the left sidebar
   - Verify it exists and has the correct structure

## Troubleshooting

### Error: "Duplicate column name"
**Meaning**: The column already exists in your table.

**Solution**: This is **OK**! It means that column was already added. The migration script is designed to skip existing columns. You can safely ignore these messages.

### Error: "Table doesn't exist"
**Meaning**: The table hasn't been created yet.

**Solution**: 
1. Run the full `schema.sql` file first to create all tables
2. Or run just the CREATE TABLE statements for the missing tables

### Error: "Foreign key constraint fails"
**Meaning**: The referenced table (e.g., `rides`) doesn't exist or has no matching data.

**Solution**: 
1. Make sure the `rides` table exists (run the CREATE TABLE statement for rides)
2. The foreign key will be added automatically once the referenced table exists

### Error: "Duplicate key name" or "Duplicate constraint"
**Meaning**: The index or constraint already exists.

**Solution**: This is **OK**! The migration script checks for existence, but some errors may still appear. Your database is fine.

### Database doesn't exist
If `arms_system` database doesn't exist:

1. In phpMyAdmin, click **"New"** in the left sidebar
2. Database name: `arms_system`
3. Collation: `utf8mb4_unicode_ci` or `utf8mb4_general_ci`
4. Click **"Create"**
5. Then run the migration script

## What This Migration Does

This migration safely adds:

✅ **ticket_classifications table:**
- `description` column (for classification details)
- `age_limit` column (already exists, but ensures it's there)
- `height_limit` column (already exists, but ensures it's there)
- `restrictions` column (already exists, but ensures it's there)
- Indexes for better performance

✅ **ticket_records table:**
- `ride_id` foreign key column (links to rides table)
- `ride_name` column (for better data consistency)
- `type` column set to NOT NULL with DEFAULT 'one-time'
- `scan_count` column (tracks how many times a ticket was scanned)
- UNIQUE constraint to prevent duplicate one-time pass scans
- Foreign key constraint linking to rides table
- Indexes for better query performance

✅ **qr_history table:**
- `type` column set to NOT NULL with DEFAULT 'one-time'
- Indexes for better performance

✅ **rides table:**
- Ensures the table exists (creates if missing)

## Quick Verification SQL

Run this in phpMyAdmin SQL tab to verify everything:

```sql
-- Check ticket_classifications columns
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'arms_system' 
AND TABLE_NAME = 'ticket_classifications'
AND COLUMN_NAME IN ('description', 'age_limit', 'height_limit', 'restrictions');

-- Check ticket_records columns
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'arms_system' 
AND TABLE_NAME = 'ticket_records'
AND COLUMN_NAME IN ('ride_id', 'ride_name', 'type', 'scan_count');

-- Check foreign keys
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'arms_system' 
AND TABLE_NAME = 'ticket_records'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## After Migration

Once the migration is complete:

1. ✅ Your classification details will now save properly
2. ✅ One-time passes will be prevented from scanning more than once
3. ✅ Unlimited passes can be scanned multiple times
4. ✅ Recent Scanned Tickets will show data from the database
5. ✅ All tables are properly connected with foreign keys

## Need Help?

If you encounter errors:
1. Take a screenshot of the error message
2. Check which step failed
3. Most errors are harmless (like "duplicate column" - means it already exists)
4. Make sure MySQL service is running in XAMPP/WAMP
5. Verify you're connected to the correct database

Your data is safe - this migration only adds columns and constraints, it doesn't delete or modify existing data!

