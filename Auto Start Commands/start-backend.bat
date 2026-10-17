@echo off
echo Starting ARMS Backend Server...
echo.

REM Navigate to server directory
cd /d "%~dp0..\server"

REM Check if Node.js exists at the expected path
if not exist "C:\Program Files\nodejs\node.exe" (
    echo ERROR: Node.js not found at C:\Program Files\nodejs\node.exe
    echo Please install Node.js or update the path in this script
    pause
    exit /b 1
)

REM Start the backend server using full path to Node.js
echo Starting backend server...
"C:\Program Files\nodejs\node.exe" server.js

pause
