@echo off
title ThinkingLab Local Host
echo ===================================================
echo   Dang khoi dong he thong ThinkingLab Local...
echo ===================================================

cd /d "%~dp0"

echo [1/2] Khoi dong Backend AI API (Port 8787)...
start "ThinkingLab - Backend API (8787)" cmd /k "cd /d ""%~dp0"" && python api/chat.py"

echo [2/2] Khoi dong Frontend Web (Port 5173)...
start "ThinkingLab - Frontend Vite (5173)" cmd /k "cd /d ""%~dp0web"" && npm run dev"

echo.
echo ===================================================
echo   He thong da khoi dong thanh cong!
echo   Vui long mo trinh duyet truy cap: http://localhost:5173
echo ===================================================
echo.
pause
