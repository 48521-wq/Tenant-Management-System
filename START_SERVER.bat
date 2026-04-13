@echo off
:: ================================================================
::  TMS — START_SERVER.bat
::  Tenant Management System  |  Backend Startup Script (Windows)
::
::  Double-click this file to install dependencies and start
::  the Express backend server automatically.
::
::  Requirements:
::    - Node.js v16 or higher must be installed
::    - Internet connection for MongoDB Atlas
:: ================================================================

echo.
echo ================================================================
echo   TMS Backend  ^|  Tenant Management System
echo ================================================================
echo.

:: ── Change into the backend directory ───────────────────────────
cd /d "%~dp0backend"

echo [1/2] Installing dependencies (skipped if already installed)...
echo.

:: Install npm packages — safe to run repeatedly (idempotent)
npm install

echo.
echo [2/2] Starting TMS backend server...
echo.
echo   Backend URL : http://localhost:5000
echo   API Base    : http://localhost:5000/api
echo   Health Check: http://localhost:5000/api/health
echo.
echo   Press Ctrl+C to stop the server.
echo.
echo ================================================================
echo.

:: Start the server — process stays open until Ctrl+C
npm start

:: Keep the window open if the server exits unexpectedly
echo.
echo Server stopped. Press any key to close this window.
pause
