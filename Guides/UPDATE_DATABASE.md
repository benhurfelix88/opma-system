# How to Update the Database Schema

This guide will help you update your existing database tables to support the new ticketing features.

## Option 1: Using phpMyAdmin (Recommended - Easiest)

### Step 1: Open phpMyAdmin
1. Make sure XAMPP is running (both Apache and MySQL services should be green)
2. Open your web browser
3. Go to: `http://localhost/phpmyadmin`
4. If prompted, login with:
   - **Username**: `root`
   - **Password**: (leave blank, or enter your MySQL password if you set one)

### Step 2: Select Your Database
1. In the left sidebar, click on the database name: `arms_system`
2. If you don't see `arms_system`, you may need to create it first (see troubleshooting below)

### Step 3: Open SQL Tab
1. Click on the **"SQL"** tab at the top of the page
2. You should see a text area where you can enter SQL commands

### Step 4: Run the Migration Script
1. Open the file `server/database/migrate_ticketing_tables.sql` in a text editor (Notepad, VS Code, etc.)
2. Copy **ALL** the contents of that file
3. Paste it into the SQL text area in phpMyAdmin
4. Click the **"Go"** button at the bottom right

### Step 5: Verify the Update
1. You should see a success message like "MySQL returned an empty result set" or "X rows affected"
2. If you see an error, don't worry - some columns might already exist (see troubleshooting below)
3. Check the tables:
   - Click on `qr_history` table → Click "Structure" tab → Verify new columns exist
   - Click on `ticket_records` table → Click "Structure" tab → Verify new columns exist

## Option 2: Using MySQL Command Line

### Step 1: Open Command Prompt/Terminal
1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to your XAMPP MySQL bin directory:
   ```bash
   cd C:\xampp\mysql\bin
   ```
   (Adjust path if XAMPP is installed elsewhere)

### Step 2: Login to MySQL
```bash
mysql -u root -p
```
- Enter your MySQL password (or press Enter if no password)
- If you get an error, try: `mysql -u root` (without -p)

### Step 3: Select the Database
```sql
USE arms_system;
```

### Step 4: Run the Migration Script
```sql
SOURCE C:/arms-system/server/database/migrate_ticketing_tables.sql;
```
(Adjust the path to match your project location)

Or copy and paste the SQL commands directly from `migrate_ticketing_tables.sql`

### Step 5: Verify
```sql
DESCRIBE qr_history;
DESCRIBE ticket_records;
```
You should see all the new columns listed.

## Troubleshooting

### Error: "Duplicate column name"
**Meaning**: Some columns already exist in your table.

**Solution**: This is okay! It means those columns were already added. The migration script will skip those columns. You can safely ignore these errors.

To handle this gracefully, you can use this alternative script that checks for column existence:

```sql
-- For QR History table
SET @dbname = DATABASE();
SET @tablename = "qr_history";
SET @columnname = "pass_type";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column already exists.';",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(50) AFTER classification;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
```

Or simply ignore the duplicate column errors and continue.

### Error: "Table doesn't exist"
**Meaning**: The tables `qr_history` or `ticket_records` don't exist yet.

**Solution**: Run the full schema file first:
1. In phpMyAdmin, go to SQL tab
2. Open and run: `server/database/schema.sql`
3. This will create all tables from scratch

### Error: "Foreign key constraint fails"
**Meaning**: The users table doesn't exist or has no data.

**Solution**: 
1. Make sure the `users` table exists
2. Make sure you have at least one user in the `users` table
3. Run the full `schema.sql` if needed

### Database doesn't exist
If `arms_system` database doesn't exist:

1. In phpMyAdmin, click "New" in the left sidebar
2. Database name: `arms_system`
3. Collation: `utf8mb4_general_ci`
4. Click "Create"
5. Then run the full `schema.sql` file

## Quick Verification Checklist

After running the migration, verify:

- [ ] `qr_history` table has these columns:
  - `pass_type`, `date`, `time`, `status`, `selected_rides`, `restrictions`, `batch_size`, `prefix`, `start_number`

- [ ] `ticket_records` table has these columns:
  - `ride_id`, `ride_name`, `classification`, `action`, `pass_type`, `scan_count`, `processed_by`, `timestamp`, `last_action`, `last_ride_name`, `last_classification`, `last_processed_by`

## Need Help?

If you encounter any errors, you can:
1. Take a screenshot of the error message
2. Check the error message details
3. Common errors are usually harmless (like duplicate columns)
4. Make sure XAMPP MySQL service is running
5. Verify you're connected to the correct database

## What This Migration Does

This migration adds new columns to support:
- ✅ QR code generation with pass types, dates, times, and ride selections
- ✅ Ticket scanning records with ride assignments and scan counts
- ✅ Better tracking of who processed tickets and when
- ✅ Support for one-time vs unlimited ride passes

Your existing data will be preserved - no data will be lost!

