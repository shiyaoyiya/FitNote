@echo off
REM ============================================================
REM  FitNote Admin Vue Panel Start Script
REM  Starts Vite dev server for admin-web on port 5175
REM ============================================================
setlocal
title FitNote Admin Web

set ADMIN_DIR=%~dp0admin-web
set ADMIN_PORT=5175

echo.
echo ==========================================
echo   FitNote Admin Web (Vue + Vite)
echo ==========================================
echo.

REM Check Node.js
echo [1/3] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found. Please install Node.js 18+ and add to PATH.
    echo   Download: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo   [OK] Node.js version: %%v

REM Check npm dependencies - auto install if missing
echo.
echo [2/3] Checking dependencies...
if not exist "%ADMIN_DIR%\node_modules" (
    echo   node_modules not found, installing dependencies...
    cd /d "%ADMIN_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo   [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo   [OK] Dependencies installed
) else (
    echo   [OK] node_modules found
)

REM Check port occupancy
echo.
echo [3/3] Checking port %ADMIN_PORT%...
netstat -ano | findstr ":%ADMIN_PORT% " | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo   [WARN] Port %ADMIN_PORT% is already in use:
    netstat -ano | findstr ":%ADMIN_PORT% " | findstr LISTENING
    echo.
    set /p CHOICE="Stop the occupying process and continue? (y/N): "
    if /i "!CHOICE!"=="y" (
        for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%ADMIN_PORT% " ^| findstr LISTENING') do (
            echo   Killing PID: %%p ...
            taskkill /PID %%p /F >nul 2>nul
        )
        timeout /t 2 /nobreak >nul
    )
)

cd /d "%ADMIN_DIR%"

echo.
echo ==========================================
echo   Starting Admin Web...
echo   Panel URL   : http://localhost:%ADMIN_PORT%
echo   Login as    : admin / 123456
echo   NOTE: Backend must be running at localhost:8080 first!
echo   Press Ctrl+C to stop Vite
echo ==========================================
echo.

REM Wait a moment for user to see banner before Vite takes over
timeout /t 2 /nobreak >nul
call npm run dev

echo.
echo Admin Web stopped. Press any key to close...
pause >nul
exit /b 0
