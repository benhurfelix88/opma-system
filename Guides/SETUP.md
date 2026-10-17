# ARMS System - Backend Setup Guide

This guide will help you set up the ARMS system with MySQL database and Node.js backend.

## Prerequisites

1. **XAMPP** - Download and install from https://www.apachefriends.org/
2. **Node.js** - Download and install from https://nodejs.org/ (v14 or higher)
3. **MySQL** - Included with XAMPP

## Step 1: Start XAMPP Services

1. Open XAMPP Control Panel
2. Start **Apache** (if needed for serving files)
3. Start **MySQL** (required for database)

## Step 2: Create Database

1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Click on "SQL" tab
3. Copy and paste the contents of `server/database/schema.sql`
4. Click "Go" to execute
5. This will create:
   - Database: `arms_system`
   - All required tables
   - Default admin user (username: `admin`, password: `Admin@123`)

**Note:** You should change the default admin password after first login!

## Step 3: Configure Backend

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, defaults work for XAMPP):
   ```bash
   # Copy the example file
   copy .env.example .env
   ```

   Default values (for XAMPP):
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=arms_system
   PORT=5000
   JWT_SECRET=arms_system_secret_key_change_in_production
   ```

4. Update `.env` if your MySQL has a password:
   ```
   DB_PASSWORD=your_mysql_password
   ```

## Step 4: Start Backend Server

1. In the `server` directory, run:
   ```bash
   npm start
   ```

2. You should see:
   ```
   ✓ Database connected successfully
   ✓ Server running on port 5000
   ✓ API available at http://localhost:5000/api
   ```

## Step 5: Configure Frontend

1. Create `.env` file in the root directory:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

2. Install frontend dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

## Step 6: Default Login Credentials

- **Username:** `admin`
- **Password:** `Admin@123`

**Important:** Change the password immediately after first login!

## Troubleshooting

### Database Connection Failed
- Ensure MySQL service is running in XAMPP
- Check if database `arms_system` exists in phpMyAdmin
- Verify MySQL credentials in `.env` file
- Check if MySQL port (3306) is available

### Backend Server Won't Start
- Ensure port 5000 is not in use by another application
- Check if all dependencies are installed (`npm install`)
- Verify Node.js version (should be v14 or higher)

### Frontend Can't Connect to Backend
- Ensure backend server is running on port 5000
- Check `REACT_APP_API_URL` in frontend `.env` file
- Verify CORS settings if accessing from different origin

### Authentication Issues
- Clear browser localStorage and cookies
- Verify JWT_SECRET in backend `.env` matches
- Check if user exists in database with correct password

## API Endpoints

The backend provides RESTful API endpoints:

- **Auth:** `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- **Users:** `/api/users` (GET, POST, PUT, DELETE)
- **Tickets:** `/api/tickets`
- **QR History:** `/api/qr-history`
- **Ticket Records:** `/api/ticket-records`
- **Classifications:** `/api/ticket-classifications`
- **Maintenance:** `/api/maintenance`
- **Incidents:** `/api/incidents`
- **Spare Parts:** `/api/spare-parts`
- **Supplies:** `/api/supplies`
- **Merchandise:** `/api/merchandise`
- **Ride Scans:** `/api/ride-scans`

All endpoints (except login) require authentication via Bearer token in Authorization header.

## Migration from localStorage

The system has been migrated from localStorage to MySQL database. All data operations now go through the backend API. localStorage is only used for:
- Authentication token (`authToken`)
- Current user session (`currentUser`)

## Production Deployment

Before deploying to production:

1. Change `JWT_SECRET` to a secure random string
2. Set a strong MySQL root password
3. Create a dedicated database user with limited privileges
4. Enable HTTPS
5. Configure environment variables properly
6. Set up proper error logging
7. Review and update CORS settings

## Support

For issues or questions, please refer to the project documentation or contact the development team.

