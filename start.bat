@echo off
title Aura Insurance - Dev Server
color 0A

echo.
echo  ================================
echo   AURA Parametric Insurance
echo   Guidewire DevTrails 2026
echo  ================================
echo.

:: Check PostgreSQL is running
sc query postgresql-x64-16 | findstr "RUNNING" >nul
if errorlevel 1 (
    echo [!] PostgreSQL is NOT running. Starting it...
    net start postgresql-x64-16
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] PostgreSQL is running.
)

:: Start FastAPI backend in new window
echo [>>] Starting FastAPI backend on http://localhost:8000 ...
start "Aura Backend" cmd /k "cd /d d:\aura-integrated\aura-integrated\backend && venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to boot
timeout /t 5 /nobreak >nul

:: Start React frontend in new window
echo [>>] Starting React frontend on http://localhost:3000 ...
start "Aura Frontend" cmd /k "cd /d d:\aura-integrated\aura-integrated\frontend && npm start"

echo.
echo  Both servers starting in separate windows.
echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:3000
echo  API Docs : http://localhost:8000/docs
echo.
echo  Press any key to open the browser...
pause >nul
start http://localhost:3000
