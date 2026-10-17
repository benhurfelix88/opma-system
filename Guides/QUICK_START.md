# Quick Start Guide - ARMS System

## 🚀 Quick Setup (5 Minutes)

### 1. Start XAMPP MySQL
- Open XAMPP Control Panel
- Click **"Start"** next to **MySQL**
- Wait for green "Running" status

### 2. Create Database
- Open browser: http://localhost/phpmyadmin
- Login: Username `root`, Password (empty)
- Click **"SQL"** tab
- Open file: `server/database/schema.sql`
- Copy ALL content and paste into SQL tab
- Click **"Go"**
- ✅ Database "arms_system" created!

### 3. Start Backend
```bash
cd server
npm install
npm start
```
✅ Should see: "Server running on port 5000"

### 4. Start Frontend
```bash
# In root folder (new terminal)
npm install
npm start
```

### 5. Login
- Go to: http://localhost:3000
- **Username:** `admin`
- **Password:** `Admin@123`

---

## ✅ Verification

### Check Database Exists:
1. Go to: http://localhost/phpmyadmin
2. Look for **"arms_system"** in left sidebar
3. Click it → See 11 tables

### Check Backend Running:
1. Go to: http://localhost:5000/api/health
2. Should see: `{"status":"ok","message":"ARMS API is running"}`

### Check Default Admin:
1. In phpMyAdmin: `arms_system` → `users` table → Browse
2. See user: username=`admin`, role=`IT Admin`

---

## 🔑 Login Credentials

**Default Admin Account:**
- **Username:** `admin`
- **Password:** `Admin@123`
- **Role:** IT Admin
- **Status:** Approved

⚠️ **Change password after first login!**

---

## 📝 File Locations

- **Database Schema:** `server/database/schema.sql`
- **Backend Server:** `server/server.js`
- **Frontend API Config:** `src/services/api.js`
- **Backend Config:** `server/.env` (optional)
- **Frontend Config:** `.env` (root folder)

---

## 🐛 Common Issues

**MySQL won't start?**
- Check if port 3306 is free
- Restart XAMPP

**Database connection failed?**
- Verify MySQL is running
- Check database name: `arms_system`
- Username: `root`, Password: (empty)

**Port 5000 in use?**
- Change port in `server/.env`: `PORT=5001`
- Update frontend `.env`: `REACT_APP_API_URL=http://localhost:5001/api`

**Can't login?**
- Verify admin user exists in database
- Username and password are case-sensitive
- Check user status is 'approved'

---

For detailed instructions, see: **BACKEND_SETUP_GUIDE.md**


