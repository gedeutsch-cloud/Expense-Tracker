@echo off
setlocal
cd /d "%~dp0"
title PM Job Finder

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo Python 3.10 or newer is not installed.
  echo Install it from the page that is opening now. On the first screen, tick "Add python.exe to PATH".
  echo Then double-click start-windows.bat again.
  start "" "https://www.python.org/downloads/"
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo First run: setting up, this takes a minute...
  %PY% -m venv .venv || goto :fail
)
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt || goto :fail

echo.
echo PM Job Finder is running at http://localhost:8000
echo Keep this window open while you use it. Close it to stop the app.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"
".venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000
goto :eof

:fail
echo.
echo Something went wrong. Copy the messages above and send them over.
pause
exit /b 1
