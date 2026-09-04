@echo off
REM ============================================================
REM  FitNote Backend + Database One-Click Start Script (Windows)
REM ============================================================
setlocal enabledelayedexpansion
title FitNote Backend Launcher

REM ---------- Config ----------
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PWD=123456
set MYSQL_DB=fitnote
set SERVER_PORT=8080
set BACKEND_DIR=%~dp0server
set JAR_FILE=%BACKEND_DIR%\target\fitnote-server-1.0.0.jar
set CREATE_DB_SQL=%BACKEND_DIR%\db\create-database.sql
REM
REM JDK 优先顺序（Spring Boot 2.7 需要 JDK 11~17，不兼容 JDK 21+）：
REM   1. 环境变量 FITNOTE_JAVA_HOME（用户自定义）
REM   2. 本地已安装的 jdk-17 目录
REM   3. 当前 PATH 里的 java（但版本必须 < 20）
set "PREF_JAVA_HOME="
if defined FITNOTE_JAVA_HOME if exist "%FITNOTE_JAVA_HOME%\bin\java.exe" set "PREF_JAVA_HOME=%FITNOTE_JAVA_HOME%"
if not defined PREF_JAVA_HOME if exist "C:\Program Files\Java\jdk-17.0.18\bin\java.exe" set "PREF_JAVA_HOME=C:\Program Files\Java\jdk-17.0.18"
if not defined PREF_JAVA_HOME if exist "C:\Program Files\Java\jdk-17\bin\java.exe" set "PREF_JAVA_HOME=C:\Program Files\Java\jdk-17"
if not defined PREF_JAVA_HOME if exist "C:\Program Files\Eclipse Adoptium\jdk-17*" (
    for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do if exist "%%d\bin\java.exe" set "PREF_JAVA_HOME=%%d"
)
if defined PREF_JAVA_HOME (
    set "PATH=%PREF_JAVA_HOME%\bin;%PATH%"
    set "JAVA_HOME=%PREF_JAVA_HOME%"
)
REM ----------------------------

echo.
echo ==========================================
echo   FitNote Backend + Database One-Click Start
echo ==========================================
echo.

REM ========== Step 1: Check Java ==========
echo [1/5] Checking Java environment...
where java >nul 2>nul
if %errorlevel% neq 0 goto :no_java
java -version >nul 2>nul
if %errorlevel% neq 0 goto :no_java
REM 打印实际使用的 java 版本（方便排查）
for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JVER=%%~v"
echo   [OK] Java is available (path: %JAVA_HOME%, version: %JVER%)
goto :step2

:no_java
echo   [ERROR] Java not found or cannot run. Please install JDK 11+ and add to PATH.
echo   Download: https://adoptium.net/
goto :fail

:step2
REM ========== Step 2: Check MySQL ==========
echo.
echo [2/5] Checking MySQL...
where mysql >nul 2>nul
if %errorlevel% neq 0 goto :no_mysql
echo   [OK] MySQL client is ready

REM Try to start MySQL service if not running
sc query MySQL80 >nul 2>nul
if %errorlevel% equ 0 (
    set SVC_NAME=MySQL80
) else (
    sc query MySQL >nul 2>nul
    if !errorlevel! equ 0 (
        set SVC_NAME=MySQL
    ) else (
        sc query mariadb >nul 2>nul
        if !errorlevel! equ 0 set SVC_NAME=mariadb
    )
)

if not defined SVC_NAME goto :try_connect

echo   Trying to ensure MySQL service [!SVC_NAME!] is running...
net start !SVC_NAME! >nul 2>nul
if !errorlevel! equ 0 (
    echo   [OK] MySQL service started or already running
) else (
    echo   [INFO] Could not auto-start service, will try direct connection...
)

:try_connect
REM Test database connection with retries
echo   Testing database connection...
set RETRY=0

:retry_conn
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% -e "SELECT 1;" >nul 2>nul
if %errorlevel% equ 0 goto :conn_ok
set /a RETRY+=1
if !RETRY! lss 5 (
    echo   Connection failed, retry !RETRY!/5 ...
    timeout /t 2 /nobreak >nul
    goto :retry_conn
)
echo.
echo   [ERROR] Cannot connect to MySQL (%MYSQL_HOST%:%MYSQL_PORT%)
echo   Please check:
echo     1. Is MySQL running?
echo     2. Is the password correct? (current: %MYSQL_PWD%)
echo     3. Is the port correct? (current: %MYSQL_PORT%)
echo   To modify, edit the MYSQL_* variables at the top of this script.
goto :fail

:conn_ok
echo   [OK] MySQL connection successful

:step3
REM ========== Step 3: Init Database ==========
echo.
echo [3/5] Initializing database...
if not exist "%CREATE_DB_SQL%" goto :no_sql_file
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% --default-character-set=utf8mb4 < "%CREATE_DB_SQL%" >nul 2>nul
if %errorlevel% equ 0 goto :db_created
echo   [WARN] Create-database script returned non-zero, may be OK if DB already exists, continuing...
goto :db_verify
:db_created
echo   [OK] Database [%MYSQL_DB%] is ready
:db_verify
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PWD% -e "USE %MYSQL_DB%;" >nul 2>nul
if %errorlevel% neq 0 goto :db_fail
echo   [OK] Database %MYSQL_DB% verified
goto :step4

:no_sql_file
echo   [ERROR] Cannot find SQL script: %CREATE_DB_SQL%
goto :fail

:db_fail
echo   [ERROR] Database %MYSQL_DB% is not accessible, please check permissions.
goto :fail

:step4
REM ========== Step 4: Check JAR / Build ==========
echo.
echo [4/5] Preparing backend build artifact...
cd /d "%BACKEND_DIR%"
if exist "%JAR_FILE%" goto :jar_ok
where mvn >nul 2>nul
if !errorlevel! neq 0 goto :no_mvn
echo   JAR not found, building with Maven (first build may take a while)...
call mvn package -DskipTests -q
if !errorlevel! neq 0 goto :mvn_fail
if not exist "%JAR_FILE%" goto :mvn_fail
echo   [OK] Maven build complete
goto :step5

:jar_ok
echo   [OK] JAR found, skipping build (delete target\ folder to rebuild)
goto :step5

:no_mvn
echo   [ERROR] Maven not found. Please install Maven 3.6+ and add to PATH.
echo   Download: https://maven.apache.org/download.cgi
goto :fail

:mvn_fail
echo   [ERROR] Maven build failed, check error messages above.
goto :fail

:step5
REM ========== Step 5: Port Check + Start ==========
echo.
echo [5/5] Starting backend service...
netstat -ano | findstr ":%SERVER_PORT% " | findstr LISTENING >nul 2>nul
if %errorlevel% neq 0 goto :start_backend

echo   [WARN] Port %SERVER_PORT% is already in use:
netstat -ano | findstr ":%SERVER_PORT% " | findstr LISTENING
echo.
set /p CHOICE="Stop the occupying process and continue? (y/N): "
if /i not "!CHOICE!"=="y" goto :skip_kill
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%SERVER_PORT% " ^| findstr LISTENING') do (
    echo   Killing PID: %%p ...
    taskkill /PID %%p /F >nul 2>nul
)
timeout /t 2 /nobreak >nul

:skip_kill
:start_backend
REM Ensure data directories exist
if not exist "%BACKEND_DIR%\data\backups" mkdir "%BACKEND_DIR%\data\backups" >nul 2>nul
if not exist "%BACKEND_DIR%\data\avatars" mkdir "%BACKEND_DIR%\data\avatars" >nul 2>nul

echo.
echo ==========================================
echo   Starting FitNote Backend...
echo   Service URL : http://localhost:%SERVER_PORT%
echo   Database    : %MYSQL_HOST%:%MYSQL_PORT%/%MYSQL_DB%
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
echo   Startup FAILED. Please check the errors above.
echo ==========================================
pause
exit /b 1

:end
echo.
echo Script finished. Press any key to close...
pause >nul
exit /b 0
