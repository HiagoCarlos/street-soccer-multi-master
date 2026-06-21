@echo off
cd /d "%~dp0"
set DBPASS=mongodb://127.0.0.1:27017/streetsoccer
set PORT=8000
node dev-server.js
pause