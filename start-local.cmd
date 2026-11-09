@echo off
setlocal
cd /d "%~dp0"

rem Prefer the project-local Node.js runtime when one has been installed.
for /d %%D in ("%~dp0.local-tools\node-*-win-x64") do if exist "%%~D\node.exe" set "PATH=%%~D;%PATH%"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22 LTS, then reopen your terminal.
  exit /b 1
)

rem Run Node directly so PowerShell's npm.ps1 policy is not involved.
node.exe scripts\local-dev.cjs %*
