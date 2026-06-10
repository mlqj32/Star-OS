
@echo off
SETLOCAL
cd /d "%~dp0"

echo ===== Configure electron download mirror =====
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://mirrors.huaweicloud.com/electron-builder-binaries/

echo.
echo ===== Step 1: npm install (if already installed it will reuse cache) =====
call npm install
IF ERRORLEVEL 1 (
  echo [ERROR] npm install failed. Please check Node.js / npm installation.
  pause
  EXIT /B 1
)

echo.
echo ===== Step 2: build folder with electron-builder (dir target) =====
call npm run build
IF ERRORLEVEL 1 (
  echo [ERROR] Build failed. Please read the error messages above.
  pause
  EXIT /B 1
)

REM Rename win-unpacked -> "Star OS"
if exist "dist\Star OS" (
  rmdir /S /Q "dist\Star OS"
)
if exist "dist\win-unpacked" (
  ren "dist\win-unpacked" "Star OS"
)

echo.
echo Build finished. Please use folder: dist\Star OS
pause

ENDLOCAL
