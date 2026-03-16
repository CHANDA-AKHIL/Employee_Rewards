@echo off
title Launching Piazza Rewards...
echo ==========================================
echo    Launching Piazza Rewards Ecosystem...
echo ==========================================

echo [1/3] Starting Backend API...
start cmd /k "cd apps\api && npm run dev"

echo [2/3] Starting Frontend Web App...
start cmd /k "cd apps\web && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

echo Opening Chrome...
start chrome "http://localhost:5173"

echo ==========================================
echo    System is now running in background.
echo    Close the terminal windows to stop.
echo ==========================================
pause
