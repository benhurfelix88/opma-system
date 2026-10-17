# ARMS System Deployment Guide

This guide will help you deploy the ARMS (Amusement Park Management System) to production using:
- **Vercel** for the frontend (React)
- **Render** for the backend (Node.js/Express) and PostgreSQL database

## Prerequisites

1. Push your code to a GitHub repository
2. Create accounts on:
   - [Vercel](https://vercel.com)
   - [Render](https://render.com)

## Deployment Steps

### 1. Deploy Database to Render

1. Log in to [Render](https://dashboard.render.com)
2. Click **New +** → **Database**
3. Select **PostgreSQL** (Render's free tier supports PostgreSQL)
4. Configure:
   - Database Name: `arms_system`
   - User: `arms_user`
   - Region: Choose closest to your users
   - PostgreSQL Version: 14 (recommended)
5. Click **Create Database**
6. Save the connection details (host, user, password, database name)

### 2. Initialize Database Schema

After the database is created, you need to run the PostgreSQL schema:

1. Go to your Render database dashboard
2. Click on the database name
3. Scroll down to **Connections** and click **External Connection**
4. Use a PostgreSQL client (pgAdmin, DBeaver, or command line) to connect
5. Run the schema file: `server/database/schema_postgres.sql`

Alternatively, you can use the Render Dashboard:
1. Click on your database
2. Scroll to **Shell**
3. Click **Connect**
4. Copy and paste the contents of `server/database/schema_postgres.sql`
5. Press Enter to execute

### 3. Deploy Backend to Render

1. Go to Render Dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - Name: `arms-system-backend`
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DB_HOST`: (from Render PostgreSQL - found in database dashboard)
   - `DB_USER`: (from Render PostgreSQL)
   - `DB_PASSWORD`: (from Render PostgreSQL)
   - `DB_NAME`: `arms_system`
   - `DB_PORT`: `5432`
   - `JWT_SECRET`: (generate a secure random string)
   - `FRONTEND_URL`: (will add after frontend deployment)
   - `GMAIL_EMAIL`: (your Gmail for email features - optional)
   - `GMAIL_APP_PASSWORD`: (your Gmail app password - optional)
6. Click **Create Web Service**
7. Wait for deployment to complete and save the backend URL

### 4. Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - Framework Preset: **Create React App**
   - Root Directory: `.` (root)
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Add Environment Variables:
   - `REACT_APP_API_URL`: (your Render backend URL, e.g., `https://arms-system-backend.onrender.com`)
6. Click **Deploy**
7. Wait for deployment to complete and save the frontend URL

### 5. Update Backend CORS Configuration

After your frontend is deployed, update the `FRONTEND_URL` environment variable in Render:
1. Go to your Render web service
2. Click **Environment**
3. Edit `FRONTEND_URL` to your Vercel URL
4. Click **Save Changes**
5. The service will automatically redeploy

### 6. Update Frontend API URL

If needed, update your React code to use the environment variable:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

## Important Notes

### Database Migration
- The system has been migrated from MySQL to PostgreSQL
- PostgreSQL is fully supported on Render's free tier
- The database configuration automatically handles MySQL-to-PostgreSQL query conversion
- All existing MySQL-specific syntax has been converted to PostgreSQL-compatible syntax

### Email Configuration
- The system uses Gmail SMTP for password reset emails
- You need to generate an App Password in your Google Account settings
- This is optional - the system will work without email features

### File Uploads
- The backend handles file uploads to a local `uploads` directory
- In production, consider using cloud storage (AWS S3, Cloudinary) for better scalability
- Render's file system is ephemeral - files may be lost on redeployment

### Security
- Change the `JWT_SECRET` to a strong, random value in production
- Ensure your database credentials are secure
- Use HTTPS in production (both Vercel and Render provide this automatically)
- Never commit `.env` files to your repository

## Troubleshooting

### Backend won't connect to database
- Verify database credentials in Render environment variables
- Check if the database is running and accessible
- Ensure the database firewall allows connections from Render
- Check the Render logs for detailed error messages

### Frontend can't reach backend
- Verify `REACT_APP_API_URL` is correct in Vercel
- Check backend CORS configuration includes your frontend URL
- Ensure backend is running and accessible
- Check browser console for CORS errors

### Build failures
- Check build logs in Vercel/Render dashboards
- Ensure all dependencies are listed in package.json
- Verify Node.js version compatibility (Render uses Node.js 18 by default)
- Make sure `pg` package is installed in server/package.json

### Database schema errors
- Ensure you ran the PostgreSQL schema file
- Check that all tables were created successfully
- Verify the database name matches `arms_system`
- Check the Render database logs for errors

## Post-Deployment Checklist

- [ ] Test all user roles (IT Admin, IT Encoder, Operations Manager, Amusement Park Personnel)
- [ ] Verify database connections
- [ ] Test file upload functionality
- [ ] Test email features (if configured)
- [ ] Check API endpoints are accessible
- [ ] Verify frontend-backend communication
- [ ] Test responsive design on mobile devices
- [ ] Test ride entry tracking
- [ ] Test incident reporting
- [ ] Test maintenance record management
- [ ] Test spare parts management

## Migration Notes

### What Changed
- **Database**: MySQL → PostgreSQL
- **Driver**: mysql2 → pg
- **Configuration**: Updated to use PostgreSQL connection parameters
- **Schema**: Created new PostgreSQL-compatible schema file
- **Query Conversion**: Automatic placeholder conversion (MySQL `?` → PostgreSQL `$1, $2`)

### Backward Compatibility
- The system maintains backward compatibility with existing MySQL queries
- A conversion layer automatically translates MySQL syntax to PostgreSQL
- No changes needed to the application code logic

### Data Migration
If you have existing MySQL data:
1. Export your MySQL database
2. Convert the dump to PostgreSQL format using tools like:
   - [pgloader](https://github.com/dimitri/pgloader)
   - [AWS Database Migration Service](https://aws.amazon.com/dms/)
   - Manual export/import with schema adjustments
3. Import into your PostgreSQL database

