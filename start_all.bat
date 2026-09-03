@echo off
TITLE PhytoVisionAI System Orchestration Launcher
COLOR 0A

echo ===============================================================================
echo                PHYTOVISIONAI RESEARCH SYSTEM ORCHESTRATOR
echo ===============================================================================
echo.
echo [1/4] Checking MongoDB Service...
netstat -ano | findstr :27017 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [+] MongoDB is already running on port 27017.
) else (
    echo   [!] MongoDB not detected on port 27017. Starting local mongod...
    start "PhytoVisionAI - MongoDB" cmd /k "mongod --dbpath data\db"
)

echo.
echo [2/4] Launching FastAPI AI Inference Engine (Port 8000)...
start "PhytoVisionAI - Python AI Service" cmd /k "cd /d %~dp0ai_service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
echo [3/4] Launching Node.js Express API Gateway (Port 5000)...
start "PhytoVisionAI - Node API Gateway" cmd /k "cd /d %~dp0backend && node server.js"

echo.
echo [4/4] Launching React / Vite Frontend (Port 5173)...
start "PhytoVisionAI - Vite Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===============================================================================
echo All services launched! Waiting 5 seconds for initialization...
echo ===============================================================================
timeout /t 5 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo PhytoVisionAI is running!
echo Press any key to exit this orchestrator launcher window (services will stay open).
pause >nul

