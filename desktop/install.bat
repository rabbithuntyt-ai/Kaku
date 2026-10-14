@echo off
setlocal enabledelayedexpansion
title Kaku setup
cd /d "%~dp0"

echo.
echo   Kaku
echo   ====
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode

for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODEV=%%v"
echo   Node !NODEV! found.
echo.
echo   Installing. The first run downloads Electron, around 100 MB,
echo   and takes a minute or two. After that it is instant.
echo.

call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo   Done.
echo.
echo     [1]  Start Kaku now
echo     [2]  Build a Windows installer and a portable exe
echo     [3]  Both
echo     [4]  Finish here
echo.
set "choice="
set /p "choice=  Choose 1-4 (or press Enter for 1): "
if "!choice!"=="" set "choice=1"

if "!choice!"=="2" goto build
if "!choice!"=="3" goto build
if "!choice!"=="4" goto bye
goto run

:build
echo.
echo   Building. This takes a few minutes.
call npm run dist:win
if errorlevel 1 goto failed
echo.
echo   Built. Look in the dist folder:
echo     Kaku Setup *.exe   installs Kaku with a Start Menu shortcut
echo     Kaku *.exe         portable, runs from anywhere including a USB stick
echo.
if exist "dist" start "" "dist"
if "!choice!"=="3" goto run
goto bye

:run
echo.
echo   Starting Kaku. Close this window when you are done.
echo   Next time you can double-click start.bat instead.
call npm start
goto bye

:nonode
echo   Node.js is not installed, and Kaku needs it to run.
echo.
echo   Opening nodejs.org now. Install the LTS version, accept the
echo   defaults, then run this file again.
echo.
start "" https://nodejs.org/en/download
pause
exit /b 1

:failed
echo.
echo   Something went wrong above. The usual causes:
echo     - no internet connection, or a VPN or firewall blocking npm
echo     - this folder is inside a OneDrive folder that is still syncing
echo   Copy the red text and search for it, or try again on a normal connection.
echo.
pause
exit /b 1

:bye
echo.
pause
exit /b 0
