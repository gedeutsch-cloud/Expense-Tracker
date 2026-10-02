@echo off
REM Double-click to launch StatPulse AI on Windows.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS installer from https://nodejs.org, run it, then double-click this file again.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies ^(one-time, about a minute^)...
  call npm ci || (echo Install failed. & pause & exit /b 1)
)

if not exist .next\BUILD_ID (
  echo Building StatPulse AI...
  call npm run build || (echo Build failed. & pause & exit /b 1)
)

start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
echo StatPulse AI is running at http://localhost:3000 - close this window to stop it.
call npm run start
