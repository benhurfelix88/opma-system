@echo off
echo Starting ARMS System (Frontend + Backend)...
echo.

REM Check if Node.js exists at the expected path
if not exist "C:\Program Files\nodejs\node.exe" (
    echo ERROR: Node.js not found at C:\Program Files\nodejs\node.exe
    echo Please install Node.js or update the path in this script
    pause
    exit /b 1
)

if not exist "C:\Program Files\nodejs\npm.cmd" (
    echo ERROR: npm not found at C:\Program Files\nodejs\npm.cmd
    echo Please install Node.js or update the path in this script
    pause
    exit /b 1
)

echo Starting Backend Server...
start "ARMS Backend" /D "%~dp0..\server" "C:\Program Files\nodejs\node.exe" server.js

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Development Server...
start "ARMS Frontend" /D "%~dp0.." "C:\Program Files\nodejs\npm.cmd" start

echo.
echo Both servers are starting in separate windows:
echo - Backend: http://localhost:5000 (or configured port)
echo - Frontend: http://localhost:3000
echo.
echo Close this window or press any key to continue...
pause
