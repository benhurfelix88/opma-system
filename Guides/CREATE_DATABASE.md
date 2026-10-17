# Fix: "Unknown database 'arms_system'"

This error means the database hasn't been created yet. Follow these steps to create it.

---

## Solution: Create the Database

### Method 1: Using phpMyAdmin (Easiest - Recommended)

1. **Start XAMPP MySQL** (if not already running)
   - Open XAMPP Control Panel
   - Click "Start" on MySQL
   - Wait for green "Running" status

2. **Open phpMyAdmin**
   - Open browser: http://localhost/phpmyadmin
   - Login:
     - Username: `root`
     - Password: (leave empty - XAMPP default)

3. **Execute SQL File**
   - Click on **"SQL"** tab at the top
   - Open file: `server/database/schema.sql` in a text editor (Notepad)
   - **Copy ALL the contents** (Ctrl+A, then Ctrl+C)
   - Paste into the SQL text box in phpMyAdmin (Ctrl+V)
   - Click **"Go"** button at the bottom

4. **Verify Success**
   - You should see success messages
   - Look at left sidebar - you should see **"arms_system"** database
   - Click on it to see all tables (users, tickets, etc.)

5. **Restart Backend**
   - Go back to your backend terminal
   - Stop it (Ctrl+C)
   - Start it again: `npm start`
   - Should now see: ✓ Database connected successfully

---

### Method 2: Using MySQL Command Line

1. **Open MySQL Command Line**
   - In XAMPP Control Panel, click "Shell" button
   - Or open Command Prompt and type:
     ```bash
     cd C:\xampp\mysql\bin
     mysql.exe -u root
     ```

2. **Create Database**
   - Copy and paste these commands one by one:
     ```sql
     CREATE DATABASE IF NOT EXISTS arms_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     USE arms_system;
     ```
   - Then open `server/database/schema.sql` file
   - Copy all SQL commands and paste them in MySQL command line
   - Press Enter after each command block

---

### Method 3: Quick Create Script (Automated)

I've created a script that will help you. See the `create-database.bat` file.

---

## Verification Steps

After creating the database, verify:

1. **Check Database Exists**
   - Go to phpMyAdmin: http://localhost/phpmyadmin
   - Look at left sidebar
   - Should see "arms_system" database ✅

2. **Check Tables Exist**
   - Click on "arms_system" database
   - Should see 11 tables:
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

3. **Check Default Admin User**
   - Click on "users" table
   - Click "Browse" tab
   - Should see 1 user:
     - username: `admin`
     - role: `IT Admin`
     - status: `approved`

4. **Restart Backend**
   - Backend should now connect successfully ✅

---

## Still Getting Error?

### Check MySQL is Running
- XAMPP Control Panel → MySQL must be "Running" (green)

### Check Database Name
- Make sure database is exactly: `arms_system` (case-sensitive)
- Check in phpMyAdmin that it exists

### Check .env File (if using one)
- In `server/.env` file, verify:
  ```
  DB_NAME=arms_system
  ```

### Try Manual Database Creation
1. In phpMyAdmin, click "New" in left sidebar
2. Database name: `arms_system`
3. Collation: `utf8mb4_unicode_ci`
4. Click "Create"
5. Then run the SQL schema file (without CREATE DATABASE line)

---

## Quick Fix Checklist

- [ ] XAMPP MySQL is running
- [ ] Opened phpMyAdmin (http://localhost/phpmyadmin)
- [ ] Executed `server/database/schema.sql` in SQL tab
- [ ] Database "arms_system" appears in left sidebar
- [ ] All 11 tables exist in the database
- [ ] Default admin user exists
- [ ] Restarted backend server
- [ ] Backend shows: "✓ Database connected successfully"

---

Once you complete these steps, your backend should connect successfully! 🎉

