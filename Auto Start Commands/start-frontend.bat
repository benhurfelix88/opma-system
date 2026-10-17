@echo off
echo Starting ARMS Frontend...
echo.

REM Navigate to root directory (where package.json is located)
cd /d "%~dp0.."

REM Check if npm exists at the expected path
if not exist "C:\Program Files\nodejs\npm.cmd" (
    echo ERROR: npm not found at C:\Program Files\nodejs\npm.cmd
    echo Please install Node.js or update the path in this script
    pause
    exit /b 1
)

REM Start the frontend using full path to npm
echo Starting frontend development server...
"C:\Program Files\nodejs\npm.cmd" start

pause
