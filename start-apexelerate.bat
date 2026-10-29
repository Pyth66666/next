@echo off
REM Starts Apexelerate locally and opens it in your browser.
cd /d "%~dp0"
title Apexelerate - keep this window open
if not exist node_modules (
  echo Installing packages, first time only...
  call npm.cmd install
)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:4174"
echo Starting Apexelerate at http://localhost:4174  (close this window or press Ctrl+C to stop)
call npm.cmd start
pause
