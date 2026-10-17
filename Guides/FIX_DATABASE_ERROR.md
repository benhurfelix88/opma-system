# Fix: "Unknown database 'arms_system'"

## Quick Solution (5 Minutes)

The database hasn't been created yet. Here's how to create it:

---

## ✅ Step-by-Step Fix

### Step 1: Verify MySQL is Running

1. Open **XAMPP Control Panel**
2. Check that **MySQL** shows **"Running"** (green status)
3. If not running, click **"Start"** next to MySQL

---

### Step 2: Open phpMyAdmin

1. Open your web browser
2. Go to: **http://localhost/phpmyadmin**
3. Login:
   - **Username:** `root`
   - **Password:** (leave empty - press Enter)

---

### Step 3: Create Database Using SQL File

**Method A: Using SQL Tab (Recommended)**

1. In phpMyAdmin, click the **"SQL"** tab at the top
2. Open the file: `server/database/schema.sql` in Notepad
   - Right-click the file → Open with → Notepad
3. **Copy ALL contents:**
   - Press `Ctrl+A` (select all)
   - Press `Ctrl+C` (copy)
4. **Paste into phpMyAdmin:**
   - Click in the SQL text box in phpMyAdmin
   - Press `Ctrl+V` (paste)
5. Click the **"Go"** button at the bottom
6. You should see a success message

**Method B: Using File Upload**

1. In phpMyAdmin, click the **"Import"** tab
2. Click **"Choose File"** button
3. Navigate to: `server/database/schema.sql`
4. Select the file
5. Click **"Go"** button at the bottom

---

### Step 4: Verify Database Created

1. Look at the **left sidebar** in phpMyAdmin
2. You should see **"arms_system"** in the database list
3. Click on **"arms_system"**
4. You should see **11 tables:**
   - users
   - sessions
   - tickets
   - qr_history
   - ticket_records
   - ticket_classifications
   - maintenance_records
   - incident_reports
   - spare_parts
   - supplies
   - merchandise
   - ride_scans

---

### Step 5: Verify Default Admin User

1. Click on **"users"** table (under arms_system)
2. Click the **"Browse"** tab
3. You should see 1 row with:
   - **username:** `admin`
   - **email:** `admin@arms-system.com`
   - **role:** `IT Admin`
   - **status:** `approved`

---

### Step 6: Restart Backend Server

1. Go back to your **backend terminal** (where you ran `npm start`)
2. **Stop the server:**
   - Press `Ctrl+C`
3. **Start it again:**
   ```bash
   npm start
   ```
4. You should now see:
   ```
   ✓ Database connected successfully
   ✓ Server running on port 5000
   ✓ API available at http://localhost:5000/api
   ```

---

## 🎉 Done!

Your backend should now connect successfully to the database!

---

## Alternative: Manual Database Creation

If the SQL file doesn't work, create manually:

1. **Create Database:**
   - In phpMyAdmin, click **"New"** in left sidebar
   - Database name: `arms_system`
   - Collation: `utf8mb4_unicode_ci`
   - Click **"Create"**

2. **Run Schema:**
   - Select "arms_system" database
   - Click **"SQL"** tab
   - Open `server/database/schema.sql`
   - **Skip the first 4 lines** (CREATE DATABASE and USE statements)
   - Copy from line 7 onwards (the CREATE TABLE statements)
   - Paste and click **"Go"**

---

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution:**
- Check if you set a MySQL password
- If yes, create `server/.env` file:
  ```
  DB_PASSWORD=your_password_here
  ```

### Error: "Table already exists"

**Solution:**
- Database partially created
- Drop database and recreate:
  1. In phpMyAdmin, click "arms_system"
  2. Click "Operations" tab
  3. Scroll down to "Drop the database"
  4. Click "Drop the database"
  5. Re-run the schema.sql file

### Still Getting "Unknown database"

**Check:**
1. Database name is exactly: `arms_system` (not `ARMS_SYSTEM` or `arms-system`)
2. MySQL is running in XAMPP
3. You're logged in as `root` user
4. Try refreshing phpMyAdmin (F5)

---

## Quick Reference

| What | Where |
|------|-------|
| phpMyAdmin | http://localhost/phpmyadmin |
| SQL File | `server/database/schema.sql` |
| Database Name | `arms_system` |
| Default Admin | username: `admin`, password: `Admin@123` |

---

**After creating the database, your backend will connect successfully!** ✅

