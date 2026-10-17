# ARMS System Auto Start Scripts

This directory contains batch scripts to easily start the ARMS (Amusement Park Management System) components.

## Scripts Available

### 1. start-backend.bat
- Starts the backend server only
- Runs from the `server` directory
- Uses Node.js at `C:\Program Files\nodejs\node.exe`
- Default port: 5000 (check server.js for actual port)

### 2. start-frontend.bat
- Starts the frontend React development server only
- Runs from the root directory
- Uses npm at `C:\Program Files\nodejs\npm.cmd`
- Default port: 3000

### 3. start-all.bat (Recommended)
- Starts both backend and frontend simultaneously
- Opens each server in a separate command window
- Waits 3 seconds between starting backend and frontend
- Most convenient option for development

## Usage

### Option 1: Double-click the script
Simply double-click any `.bat` file to run it.

### Option 2: Run from command line
```batch
# Start both servers
start-all.bat

# Or start individually
start-backend.bat
start-frontend.bat
```

## Requirements

- Node.js installed at `C:\Program Files\nodejs\`
- Database configured in `server/.env` file
- Dependencies installed (`npm install` in both root and server directories)

## Troubleshooting

### "Node.js not found" Error
If you get an error about Node.js not being found, either:
1. Install Node.js from https://nodejs.org
2. Update the paths in the batch files to match your Node.js installation location

### Port Already in Use
If a port is already in use:
- Close any existing server instances
- Check for other applications using ports 3000 or 5000
- Modify the port settings in the configuration files

### Database Connection Issues
Ensure your `server/.env` file contains the correct database credentials:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=arms_database
```

## Access URLs

Once running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Stopping the Servers

To stop the servers:
- Close the command windows that opened
- Or press `Ctrl+C` in each server window
- Or use Task Manager to end the `node.exe` processes
