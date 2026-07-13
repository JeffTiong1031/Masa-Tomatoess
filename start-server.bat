@echo off
cd /d "%~dp0"

:: Start the dev server and write its PID to a file so we can kill it later
start /b cmd /c "npm run dev & echo done" > nul 2>&1

:: Give it a moment to spawn, then capture the node.exe PID listening on port 3000
:: We use a polling loop since the server takes a few seconds to bind
:waitloop
timeout /t 1 /nobreak > nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo %%a > "%~dp0.server.pid"
    goto :done
)
goto :waitloop

:done
