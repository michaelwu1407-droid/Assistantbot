@echo off
title Earlymark - local website
cd /d "%~dp0"

echo.
echo Starting the app... (this window must stay open)
echo When you see "Ready", open: http://localhost:3000
echo.

call npm run dev

echo.
echo The server stopped. Press any key to close this window.
pause >nul
