@echo off
title LifeLens Local Web Server
cd /d "%~dp0"
echo ===================================================
echo   LifeLens Smart Daily Life Dashboard
echo ===================================================
echo   Starting local server...
echo   Open in your browser:
echo   -^> http://localhost:5500/
echo   -^> http://127.0.0.1:5500/
echo   -^> http://localhost:5500/dashboard.html
echo.
echo   Keep this window OPEN while testing your app!
echo ===================================================
powershell -ExecutionPolicy Bypass -File .\server.ps1
pause
