# Troubleshooting: "localhost refused to connect"

## Common Causes & Solutions

### Issue 1: Backend Server Not Running

**Symptom:** Browser shows "localhost refused to connect" when accessing http://localhost:5000

**Solution:**
1. Open terminal/command prompt
2. Navigate to server folder:
   ```bash
   cd server
   ```
3. Start the backend:
   ```bash
   npm start
   ```
4. You should see:
   ```
   ✓ Database connected successfully
   ✓ Server running on port 5000
   ✓ API available at http://localhost:5000/api
   ```
5. **Keep this terminal open!** The server must stay running.

**Test:** Open browser → http://localhost:5000/api/health
- Should see: `{"status":"ok","message":"ARMS API is running"}`

---

### Issue 2: Frontend Server Not Running

**Symptom:** Browser shows "localhost refused to connect" when accessing http://localhost:3000

**Solution:**
1. Open a NEW terminal/command prompt (keep backend terminal open)
2. Navigate to project root folder:
   ```bash
   cd C:\arms-system
   ```
   (Or wherever your project is located)

3. Start the frontend:
   ```bash
   npm start
   ```
4. Wait for browser to auto-open (may take 30-60 seconds)
5. You should see React app loading

**Note:** If browser doesn't auto-open, manually go to: http://localhost:3000

---

### Issue 3: MySQL Not Running (Backend Won't Start)

**Symptom:** Backend shows "Database connection failed"

**Solution:**
1. Open XAMPP Control Panel
2. Start MySQL service (click "Start")
3. Wait for green "Running" status
4. Restart backend server:
   ```bash
   cd server
   npm start
   ```

---

### Issue 4: Wrong URL/Port

**Check which service you're trying to access:**

- **Frontend (React App):** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Backend Health Check:** http://localhost:5000/api/health
- **phpMyAdmin:** http://localhost/phpmyadmin

**Make sure you're using the correct URL!**

---

### Issue 5: Port Already in Use

**Symptom:** Error like "Port 5000 is already in use" or "Port 3000 is already in use"

**Solution for Backend (Port 5000):**
1. Find what's using port 5000:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :5000
   
   # Windows CMD
   netstat -ano | findstr :5000
   ```
2. Kill the process or change port:
   - Create `server/.env` file:
     ```
     PORT=5001
     ```
   - Update frontend `.env`: `REACT_APP_API_URL=http://localhost:5001/api`
   - Restart backend

**Solution for Frontend (Port 3000):**
1. React will usually ask if you want to use another port
2. Type "Y" when prompted
3. Or set port manually:
   ```bash
   # Windows PowerShell
   $env:PORT=3001; npm start
   
   # Windows CMD
   set PORT=3001 && npm start
   ```

---

### Issue 6: Firewall Blocking Connection

**Symptom:** Connection works on localhost but not from other devices

**Solution:**
1. Windows Firewall may be blocking Node.js
2. Allow Node.js through firewall:
   - Windows Settings → Firewall → Allow an app
   - Find Node.js and check both "Private" and "Public"

---

## Complete Startup Checklist

Follow this order every time:

### ✅ Step-by-Step Startup

1. **Start XAMPP MySQL**
   - [ ] Open XAMPP Control Panel
   - [ ] Click "Start" on MySQL
   - [ ] Verify green "Running" status

2. **Start Backend Server** (Terminal 1)
   ```bash
   cd server
   npm start
   ```
   - [ ] See "Server running on port 5000"
   - [ ] See "Database connected successfully"
   - [ ] Terminal stays open

3. **Start Frontend Server** (Terminal 2 - NEW terminal)
   ```bash
   cd C:\arms-system
   npm start
   ```
   - [ ] Wait for compilation (30-60 seconds)
   - [ ] Browser should auto-open to http://localhost:3000
   - [ ] If not, manually open: http://localhost:3000

4. **Verify Everything Works**
   - [ ] Backend health: http://localhost:5000/api/health
   - [ ] Frontend: http://localhost:3000
   - [ ] Can see login page

---

## Diagnostic Commands

### Check if Backend is Running
```bash
# Test backend health
curl http://localhost:5000/api/health

# Or open in browser:
http://localhost:5000/api/health
```

### Check if Frontend is Running
```bash
# Open in browser:
http://localhost:3000
```

### Check Port Usage
```bash
# Windows PowerShell - Check port 5000
netstat -ano | findstr :5000

# Windows PowerShell - Check port 3000
netstat -ano | findstr :3000
```

### Check if MySQL is Running
- Open XAMPP Control Panel
- MySQL should show "Running" in green
- Or test: http://localhost/phpmyadmin

---

## Common Error Messages

### "Cannot GET /"
- **Cause:** Trying to access backend root URL
- **Solution:** Use http://localhost:5000/api/health or http://localhost:3000 (frontend)

### "ECONNREFUSED"
- **Cause:** Server not running or wrong port
- **Solution:** Start the server (backend or frontend)

### "Port 5000 is already in use"
- **Cause:** Another instance of backend is running
- **Solution:** Kill existing process or use different port

### "Database connection failed"
- **Cause:** MySQL not running or wrong credentials
- **Solution:** Start MySQL in XAMPP, check .env file

---

## Quick Fix Scripts

### Windows Batch Script to Start Everything

Create `start-backend.bat` in `server` folder:
```batch
@echo off
echo Starting ARMS Backend Server...
cd /d %~dp0
npm start
pause
```

Create `start-frontend.bat` in root folder:
```batch
@echo off
echo Starting ARMS Frontend...
cd /d %~dp0
npm start
pause
```

Then just double-click these files to start!

---

## Still Not Working?

### 1. Check Node.js Installation
```bash
node --version
npm --version
```
Should show version numbers. If not, install Node.js.

### 2. Check Dependencies Installed
```bash
# In server folder
cd server
npm install

# In root folder
cd ..
npm install
```

### 3. Check File Locations
- Backend: `server/server.js` should exist
- Database schema: `server/database/schema.sql` should exist
- Frontend .env: Root folder `.env` with `REACT_APP_API_URL=http://localhost:5000/api`

### 4. Check Console/Logs
- Look at terminal output for error messages
- Check browser console (F12) for frontend errors
- Check backend terminal for database errors

### 5. Reset Everything
1. Stop all servers (Ctrl+C in terminals)
2. Stop MySQL in XAMPP
3. Restart MySQL
4. Start backend
5. Start frontend

---

## Getting Help

If none of these solutions work:

1. **Check the terminal output** - Error messages usually tell you what's wrong
2. **Check browser console** (F12 → Console tab)
3. **Verify all prerequisites:**
   - Node.js installed: `node --version`
   - XAMPP MySQL running
   - Database exists (check phpMyAdmin)
   - All dependencies installed (`npm install` in both folders)

4. **Common Mistakes:**
   - ❌ Forgot to start MySQL in XAMPP
   - ❌ Forgot to start backend server
   - ❌ Trying to access wrong URL/port
   - ❌ Dependencies not installed
   - ❌ Database not created
   - ❌ Wrong folder when running commands

---

## Quick Reference

| Service | URL | Port | How to Start |
|---------|-----|------|--------------|
| Frontend | http://localhost:3000 | 3000 | `npm start` (root folder) |
| Backend API | http://localhost:5000/api | 5000 | `npm start` (server folder) |
| Backend Health | http://localhost:5000/api/health | 5000 | (auto with backend) |
| phpMyAdmin | http://localhost/phpmyadmin | 80 | (auto with Apache/XAMPP) |

---

**Remember:** You need BOTH servers running:
1. Backend (port 5000) - handles database
2. Frontend (port 3000) - React web interface

Both must be running at the same time!

