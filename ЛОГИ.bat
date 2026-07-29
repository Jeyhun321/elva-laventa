@echo off
chcp 65001 >nul
title Elva LaVenta - системные логи
cd /d "%~dp0"

REM Ищем node: сначала в PATH, потом в стандартной папке установки.
where node >nul 2>nul
if %errorlevel%==0 (
  node tools\log-tail.mjs %*
) else (
  "C:\Program Files\nodejs\node.exe" tools\log-tail.mjs %*
)

echo.
echo --- Просмотр логов завершён. Окно можно закрыть. ---
pause
