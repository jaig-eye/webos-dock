@echo off
rem Renews LG Developer Mode (resets its session timer, about 1000 hours) so Dock stays installed,
rem then brings Dock back to the screen. Run it from anywhere on this PC while the TV is on.
rem If Developer Mode ever lapses, Dock disappears and the TV simply behaves like stock: reinstall with
rem   tools\ares ares-install --device tv dist\com.jaigeye.home_<version>_all.ipk
setlocal
for %%i in ("%~dp0..") do set "ROOT=%%~fi"
call "%ROOT%\tools\ares.cmd" ares-launch --device tv com.palmdts.devmode -p "extend=true"
if errorlevel 1 (
  echo Could not reach the TV. Is it on, and is Developer Mode still active?
  exit /b 1
)
rem wait about 6 seconds (ping works in every shell, unlike timeout)
ping -n 7 127.0.0.1 >nul
call "%ROOT%\tools\ares.cmd" ares-launch --device tv com.jaigeye.home
echo Done. Check "Remain Session" in the Developer Mode app if you want to confirm.
