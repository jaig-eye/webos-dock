@echo off
rem Runs one of the local webOS CLI tools with its data folder inside this project (.ares\.webos).
rem Why: the CLI normally keeps its device list under %APPDATA%. Keeping it in the project makes the setup portable and
rem avoids sandboxed terminals (some packaged apps get their own private copy of AppData) losing track of the TV.
rem Usage (from the project folder):  tools\ares ares-novacom --device tv --getkey
setlocal
for %%i in ("%~dp0..") do set "ROOT=%%~fi"
set "APPDATA=%ROOT%\.ares"
if not exist "%APPDATA%" mkdir "%APPDATA%"
rem First word = tool name, the rest is passed through untouched (batch shift would split on "=").
for /f "tokens=1*" %%a in ("%*") do (
  set "TOOL=%%a"
  set "ARGS=%%b"
)
call "%ROOT%\node_modules\.bin\%TOOL%.cmd" %ARGS%
exit /b %ERRORLEVEL%
