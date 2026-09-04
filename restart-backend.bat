@echo off
REM ============================================================
REM  FitNote Backend Restart Script (Windows)
REM  Stops the running backend on port 8080, then starts it again
REM ============================================================
setlocal enabledelayedexpansion
title FitNote Backend Restart

set BACKEND_DIR=%~dp0server
set JAR_FILE=%BACKEND_DIR%\target\fitnote-server-1.0.0.jar
set SERVER_PORT=8080

echo.
echo ==========================================
echo   FitNote Backend Restart
echo ==========================================
echo.

REM ========== Step 1: Stop running backend ==========
echo [1/2] Stopping backend on port %SERVER_PORT%...
set FOUND_PID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%SERVER_PORT% " ^| findstr LISTENING') do (
    set FOUND_PID=%%p
    echo   Killing PID: %%p ...
    taskkill /PID %%p /F >nul 2>nul
)
if not defined FOUND_PID (
    echo   [INFO] No process found on port %SERVER_PORT%, starting fresh...
) else (
    echo   [OK] Previous backend stopped
    timeout /t 2 /nobreak >nul
)

REM ========== Step 2: Start backend ==========
echo.
echo [2/2] Starting backend...

if not exist "%JAR_FILE%" (
    echo   [ERROR] JAR not found: %JAR_FILE%
    echo   Please run start-backend.bat first to build the project.
    goto :fail
)

REM Ensure data directories exist
if not exist "%BACKEND_DIR%\data\backups" mkdir "%BACKEND_DIR%\data\backups" >nul 2>nul
if not exist "%BACKEND_DIR%\data\avatars" mkdir "%BACKEND_DIR%\data\avatars" >nul 2>nul

echo.
echo ==========================================
echo   Starting FitNote Backend...
echo   Service URL : http://localhost:%SERVER_PORT%
echo   Press Ctrl+C to stop the service
echo ==========================================
echo.

java -jar -Dfile.encoding=UTF-8 "%JAR_FILE%"
set EXIT_CODE=%errorlevel%
echo.
echo Backend process exited with code: %EXIT_CODE%
goto :end

:fail
echo.
echo ==========================================
echo   Restart FAILED. Please check the errors above.
echo ==========================================
pause
exit /b 1

:end
echo.
echo Script finished. Press any key to close...
pause >nul
exit /b 0
