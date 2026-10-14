@echo off
title Kaku
cd /d "%~dp0"
if not exist "node_modules" (
  echo First run: setting things up. Use install.bat if this fails.
  call npm install --no-audit --no-fund
)
call npm start
