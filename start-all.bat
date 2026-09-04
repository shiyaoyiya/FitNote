@echo off
REM ============================================================
REM  FitNote FULL One-Click Start
REM  1. Ensure MySQL is running + init database (waits for success)
REM  2. Launch Backend (Spring Boot) in a NEW cmd window
REM  3. Launch Admin Web (Vue + Vite) in a NEW cmd window
REM ============================================================
setlocal enabledelayedexpansion
title FitNote Start All

set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PWD=123456
set MYSQL_DB=fitnote
set BACKEND_PORT=8080
set ADMIN_PORT=5175
set ROOT=%~dp0
set CREATE_DB_SQL=%ROOT%server\db\create-database.sql

cls
echo.
echo  ###########################################################
echo  #     FitNote - One-Click Full Stack Launcher           #
echo  ###########################################################
echo  #   Phase 1: MySQL check + Database init                 #
echo  #   Phase 2: Launch Backend  (Spring Boot  on port 8080) #
echo  #   Phase 3: Launch Admin UI (Vue + Vite  on port 5175)  #
echo  ###########################################################
echo.

REM ========== Phase 1: MySQL + Database ==========
echo [Phase 1/3] Preparing MySQL and database...
echo.

where mysql >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] MySQL client not found. Install MySQL 8.0 and add bin to PATH.
    goto :fail
)
echo   [OK] MySQL client found

REM Try to start service auto
sc query MySQL80 >nul 2>nul
if %errorlevel% equ 0 set SVC_NAME=MySQL80
if not defined SVC_NAME (
    sc query MySQL >nul 2>nul
    if !errorlevel! equ 0 set SVC_NAME=MySQL
)
if not defined SVC_NAME (
    sc query mariadb >nul 2>nul
    if !errorlevel! equ 0 set SVC_NAME=mariadb
)
if defined SVC_NAME (
    echo   Auto-starting MySQL service [!SVC_NAME!]...
    net start !SVC_NAME! >nul 2>nul
)

REM Retry connection
set RETRY=0
:retry1
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% -e "SELECT 1;" >nul 2>nul
if %errorlevel% equ 0 goto :mysql_ok
set /a RETRY+=1
if !RETRY! lss 10 (
    echo   Waiting for MySQL... attempt !RETRY!/10
    timeout /t 3 /nobreak >nul
    goto :retry1
)
echo   [ERROR] Could not connect to MySQL after 10 attempts.
echo   Is MySQL installed and password correct? (root / %MYSQL_PWD%)
echo   You may need to start MySQL manually:
echo     Win+R -^> services.msc -^> find MySQL -^> right-click Start
goto :fail

:mysql_ok
echo   [OK] MySQL connected

REM Init database
if exist "%CREATE_DB_SQL%" (
    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% --default-character-set=utf8mb4 < "%CREATE_DB_SQL%" >nul 2>nul
)
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% -e "USE %MYSQL_DB%;" >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Database %MYSQL_DB% not accessible after init.
    goto :fail
)
echo   [OK] Database %MYSQL_DB% ready

echo.
echo [Phase 1/3] Complete.
echo.

REM ========== Phase 2: Kill any existing backend on 8080 ==========
echo [Phase 2/3] Launching Backend on port %BACKEND_PORT%...
netstat -ano | findstr ":%BACKEND_PORT% " | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo   Found existing process on port %BACKEND_PORT%, killing it...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%BACKEND_PORT% " ^| findstr LISTENING') do (
        taskkill /PID %%p /F >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
)

REM Launch backend in a NEW window
start "FitNote Backend :8080" cmd /k "cd /d ""%ROOT%"" && start-backend.bat"
echo   [OK] Backend launch window opened (wait ~15s for Spring Boot to boot)

REM Give backend a head start
echo   Waiting 12 seconds for backend to initialize before launching Admin UI...
timeout /t 12 /nobreak >nul

REM ========== Phase 3: Kill any existing vite on 5175 ==========
echo.
echo [Phase 3/3] Launching Admin Web on port %ADMIN_PORT%...
netstat -ano | findstr ":%ADMIN_PORT% " | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo   Found existing process on port %ADMIN_PORT%, killing it...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%ADMIN_PORT% " ^| findstr LISTENING') do (
        taskkill /PID %%p /F >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
)

REM Launch admin web in a NEW window
start "FitNote Admin Web :5175" cmd /k "cd /d ""%ROOT%"" && start-admin.bat"
echo   [OK] Admin UI launch window opened

echo.
echo  ###########################################################
echo  #              STARTUP COMPLETE                          #
echo  ###########################################################
echo  #                                                         #
echo  #   Backend   : http://localhost:%BACKEND_PORT%           #
echo  #   Admin UI  : http://localhost:%ADMIN_PORT%             #
echo  #   Login     : admin  /  123456                          #
echo  #                                                         #
echo  #   Two windows have been opened (Backend + Admin).       #
echo  #   Close those windows to stop each service.             #
echo  #                                                         #
echo  ###########################################################
echo.
echo   You can close THIS window now - it has done its job.
echo.
pause
exit /b 0

:fail
echo.
echo  ###########################################################
echo  #   STARTUP FAILED - see errors above                     #
echo  ###########################################################
echo.
pause
exit /b 1
