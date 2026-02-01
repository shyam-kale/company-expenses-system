@echo off
title ExpenseFlow - Complete Project Launcher
color 0A

echo ============================================================
echo    EXPENSEFLOW - COMPLETE PROJECT LAUNCHER
echo ============================================================
echo.
echo Starting Backend and Frontend servers...
echo.

REM Start Backend in new window
echo [1/2] Starting Complete Backend Server...
start "ExpenseFlow Backend" cmd /k "cd backend && py app_complete.py"
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
echo [2/2] Starting Frontend Server...
start "ExpenseFlow Frontend" cmd /k "cd frontend && npm start"

echo.
echo ============================================================
echo    SERVERS STARTING...
echo ============================================================
echo.
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to exit this launcher...
echo ============================================================
pause >nul