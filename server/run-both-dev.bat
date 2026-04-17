@echo off
setlocal

echo Starting backend and frontend dev servers...

start "SKATYS Backend" cmd /k "cd /d %~dp0server && npm run dev"
start "SKATYS Frontend" cmd /k "cd /d %~dp0frontEnd && npm run dev"

echo Done. Two terminals should be open now.
