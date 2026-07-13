@echo off
cd /d "%~dp0"

:: Read the saved PID
if not exist ".server.pid" (
    echo No server PID file found. The server may not be running.
    pause
    exit /b
)

set /p PID=<.server.pid

:: Kill the entire process tree rooted at that PID
taskkill /F /T /PID %PID% > nul 2>&1

:: Clean up the PID file
del /f ".server.pid" > nul 2>&1

echo Masa Tomato server stopped.
