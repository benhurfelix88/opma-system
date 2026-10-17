# Complete Backend Database Setup Guide

This guide will walk you through setting up and running the ARMS system backend with MySQL database.

## Prerequisites Checklist

Before starting, make sure you have:
- ✅ **XAMPP installed** (Download from: https://www.apachefriends.org/)
- ✅ **Node.js installed** (v14 or higher)
- ✅ **npm installed** (comes with Node.js)

---

## Step 1: Start XAMPP MySQL Service

1. **Open XAMPP Control Panel**
   - On Windows: Look for "XAMPP Control Panel" in your Start Menu
   - You should see a control panel with Apache, MySQL, and other services

2. **Start MySQL Service**
   - Find the **MySQL** row in the control panel
   - Click the **"Start"** button next to MySQL
   - Wait until the status shows **"Running"** (usually shown in green)
   - If you see any errors, check the error log by clicking "Logs"

   **Expected Result:** MySQL status should show as "Running" with a green background

3. **Verify MySQL is Running**
   - Look at the MySQL status - it should say "Running"
   - Note the port number (usually **3306**)

---

## Step 2: Access phpMyAdmin

1. **Open phpMyAdmin**
   - Open your web browser
   - Go to: **http://localhost/phpmyadmin**
   - You should see the phpMyAdmin interface

2. **Login to phpMyAdmin**
   - **Username:** `root`
   - **Password:** (leave empty - XAMPP default has no password)
   - Click "Go" or press Enter

   **If you set a MySQL password:**
   - Use that password instead

---

## Step 3: Check if Database Already Exists

### Option A: Check via phpMyAdmin (Visual Method)

1. **Look at the left sidebar** in phpMyAdmin
2. **Find "arms_system"** in the database list
3. If you see it:
   - ✅ **Database exists!** Skip to Step 5 (Verify Tables)
   - Click on "arms_system" to see its tables

### Option B: Check via SQL Query

1. In phpMyAdmin, click on the **"SQL"** tab at the top
2. Enter this query:
   ```sql
   SHOW DATABASES LIKE 'arms_system';
   ```
3. Click "Go"
4. **If you see a result:**
   - ✅ Database exists
   - Skip to Step 5
5. **If you see "No rows found":**
   - ❌ Database doesn't exist
   - Continue to Step 4

---

## Step 4: Create the Database

### Method 1: Using SQL File (Recommended)

1. **Open the SQL file**
   - Navigate to your project folder
   - Open: `server/database/schema.sql`
   - Copy ALL the contents (Ctrl+A, Ctrl+C)

2. **Execute in phpMyAdmin**
   - In phpMyAdmin, click the **"SQL"** tab
   - Paste the entire SQL script (Ctrl+V)
   - Click **"Go"** button at the bottom

3. **Check for Success**
   - You should see a green success message: "MySQL returned an empty result set" or similar
   - If you see errors (red), check:
     - Ensure MySQL is running
     - Check if database already exists

4. **Verify Database Creation**
   - Look at the left sidebar
   - You should now see **"arms_system"** database
   - Click on it to see all the tables

### Method 2: Manual Creation

1. **Create Database**
   - In phpMyAdmin, click **"New"** in the left sidebar
   - Database name: `arms_system`
   - Collation: `utf8mb4_unicode_ci`
   - Click **"Create"**

2. **Create Tables**
   - Select "arms_system" database
   - Click "SQL" tab
   - Copy and paste the table creation statements from `server/database/schema.sql`
   - Execute the SQL

---

## Step 5: Verify Tables and Default Admin

1. **Check Tables Exist**
   - In phpMyAdmin, click on "arms_system" database (left sidebar)
   - You should see these tables:
     - ✅ users
     - ✅ sessions
     - ✅ tickets
     - ✅ qr_history
     - ✅ ticket_records
     - ✅ ticket_classifications
     - ✅ maintenance_records
     - ✅ incident_reports
     - ✅ spare_parts
     - ✅ supplies
     - ✅ merchandise
     - ✅ ride_scans

2. **Verify Default Admin User**
   - Click on the **"users"** table
   - Click **"Browse"** tab
   - You should see one user:
     - **username:** `admin`
     - **email:** `admin@arms-system.com`
     - **role:** `IT Admin`
     - **status:** `approved`

3. **Check Admin Password**
   - The password field shows: `Admin@123` (plain text)
   - This is the default login password

---

## Step 6: Install Backend Dependencies

1. **Open Terminal/Command Prompt**
   - Navigate to your project folder
   - Open terminal in that location

2. **Navigate to Server Folder**
   ```bash
   cd server
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```
   
   **Expected Output:**
   ```
   npm WARN saveError ENOENT: ...
   added 150 packages in 30s
   ```

4. **Wait for Installation**
   - This may take 1-3 minutes
   - Don't close the terminal

---

## Step 7: Configure Backend (Optional)

1. **Check if .env file exists**
   - In the `server` folder, look for `.env` file
   - If it doesn't exist, create one (or use defaults)

2. **Default Configuration (No .env needed)**
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=          (empty - XAMPP default)
   DB_NAME=arms_system
   PORT=5000
   ```

3. **If You Have MySQL Password**
   - Create `server/.env` file:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   DB_NAME=arms_system
   PORT=5000
   JWT_SECRET=arms_system_secret_key_change_in_production
   ```

---

## Step 8: Start the Backend Server

1. **In the Terminal (still in server folder)**
   ```bash
   npm start
   ```

2. **Expected Output:**
   ```
   ✓ Database connected successfully
   ✓ Server running on port 5000
   ✓ API available at http://localhost:5000/api
   ```

3. **If You See Errors:**

   **Error: "Database connection failed"**
   - ✅ Check XAMPP MySQL is running
   - ✅ Verify database "arms_system" exists
   - ✅ Check username/password in .env file
   - ✅ Try accessing phpMyAdmin

   **Error: "Port 5000 already in use"**
   - Another application is using port 5000
   - Change PORT in .env to another port (e.g., 5001)
   - Or stop the application using port 5000

4. **Keep Terminal Open**
   - ⚠️ Don't close this terminal
   - The server must stay running for the system to work
   - To stop: Press `Ctrl+C` in the terminal

---

## Step 9: Test the Backend API

1. **Test Health Endpoint**
   - Open browser
   - Go to: **http://localhost:5000/api/health**
   - You should see:
     ```json
     {
       "status": "ok",
       "message": "ARMS API is running"
     }
     ```

2. **Test Database Connection**
   - If health check works, database is connected ✅

---

## Step 10: Setup Frontend

1. **Create Frontend .env File**
   - In the **root** project folder (not server folder)
   - Create file named `.env`
   - Add this line:
     ```
     REACT_APP_API_URL=http://localhost:5000/api
     ```

2. **Install Frontend Dependencies** (if not done)
   ```bash
   # In root folder
   npm install
   ```

3. **Start Frontend**
   ```bash
   npm start
   ```

---

## Login Credentials

### Default Admin Account

**Username:** `admin`  
**Password:** `Admin@123`

⚠️ **IMPORTANT SECURITY NOTE:**
- This is the default password
- **CHANGE IT IMMEDIATELY** after first login for security
- The password is stored as plain text in the database initially

### How to Change Admin Password (After Setup)

1. **Option 1: Via Application**
   - Log in as admin
   - Go to User Management
   - Edit your own user account
   - Change password

2. **Option 2: Via Database**
   - Open phpMyAdmin
   - Go to `arms_system` database
   - Click `users` table
   - Click "Edit" for admin user
   - Update password field
   - Save

---

## Quick Verification Checklist

Use this checklist to verify everything is set up correctly:

- [ ] XAMPP MySQL is running (green status)
- [ ] phpMyAdmin accessible at http://localhost/phpmyadmin
- [ ] Database "arms_system" exists in phpMyAdmin
- [ ] All 11 tables exist in "arms_system" database
- [ ] Default admin user exists (username: admin)
- [ ] Backend server running (terminal shows success messages)
- [ ] Health check works (http://localhost:5000/api/health)
- [ ] Frontend .env file created with API URL
- [ ] Can log in with admin/Admin@123

---

## Troubleshooting

### Problem: Can't Access phpMyAdmin

**Solution:**
- Make sure Apache is also started in XAMPP
- Try: http://127.0.0.1/phpmyadmin
- Check XAMPP error logs

### Problem: Database Connection Failed

**Check:**
1. MySQL service is running in XAMPP
2. Database name is exactly `arms_system` (case-sensitive)
3. Username is `root`
4. Password is empty (or correct if you set one)
5. Check `server/.env` file settings

### Problem: Port 5000 Already in Use

**Solutions:**
1. Find what's using port 5000 and stop it
2. Or change backend port:
   - Edit `server/.env`: `PORT=5001`
   - Update frontend `.env`: `REACT_APP_API_URL=http://localhost:5001/api`

### Problem: Tables Don't Exist

**Solution:**
- Re-run the SQL schema file
- Check for errors in phpMyAdmin
- Ensure you selected the correct database

### Problem: Can't Login

**Check:**
- Username: `admin` (exact, case-sensitive)
- Password: `Admin@123` (exact, case-sensitive)
- Verify user exists in database: `SELECT * FROM users WHERE username='admin';`
- Check user status is 'approved'

---

## Running the Complete System

### Daily Startup Procedure

1. **Start XAMPP**
   - Open XAMPP Control Panel
   - Start MySQL (and Apache if needed)

2. **Start Backend Server**
   ```bash
   cd server
   npm start
   ```
   Keep terminal open!

3. **Start Frontend** (in new terminal)
   ```bash
   npm start
   ```
   Browser should open automatically

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - phpMyAdmin: http://localhost/phpmyadmin

---

## Database Management

### View All Data
- Use phpMyAdmin to browse tables
- Click database → Click table → Click "Browse"

### Backup Database
1. In phpMyAdmin, select "arms_system" database
2. Click "Export" tab
3. Choose format (SQL recommended)
4. Click "Go" to download

### Reset Database
1. Drop database in phpMyAdmin
2. Re-run `server/database/schema.sql`

---

## Summary

✅ **MySQL is running** when XAMPP shows green "Running" status  
✅ **Database exists** when you see "arms_system" in phpMyAdmin  
✅ **Backend is running** when terminal shows "Server running on port 5000"  
✅ **Login with:** Username: `admin`, Password: `Admin@123`

You're all set! The system is ready to use. 🎉


