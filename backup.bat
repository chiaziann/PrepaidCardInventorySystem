@echo off
setlocal

cd /d "%~dp0"
set "BACKUP_DIR=backups"
set "DB_FILE=db\inventory.db"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TIMESTAMP=%%i"

if not exist "%DB_FILE%" (
  echo Database not found: %DB_FILE%
  echo Please start the app at least once before backing up.
  pause
  exit /b 1
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

copy /Y "%DB_FILE%" "%BACKUP_DIR%\inventory_%TIMESTAMP%.db" >nul
if errorlevel 1 (
  echo Backup failed.
  pause
  exit /b 1
)

echo Backup saved to %BACKUP_DIR%\inventory_%TIMESTAMP%.db
pause
