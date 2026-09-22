
@echo off
chcp 65001 >nul
title GIAVAL

echo ================================================
echo       GIAVAL - Agente Inteligente de Avaluos
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Descargando actualizaciones de GitHub...
git fetch origin master 2>nul
if %errorlevel% neq 0 goto DEPS
git checkout -- . 2>nul
git pull origin master 2>nul
if %errorlevel% neq 0 echo AVISO: No se pudo actualizar. Continuando con version actual.

:DEPS
echo.
echo [2/4] Verificando dependencias...
echo   Dependencias raiz...
call npm install --prefer-offline --silent 2>nul || call npm install --silent
echo   Dependencias backend...
call npm install --prefix backend --prefer-offline --silent 2>nul || call npm install --prefix backend --silent
echo   Verificando sharp (modulo de imagenes para mapas)...
call npm install --prefix backend sharp --silent 2>nul
echo   Dependencias frontend...
call npm install --prefix frontend --prefer-offline --silent 2>nul || call npm install --prefix frontend --silent

echo.
echo [3/4] Verificando configuracion...
if not exist "backend\.env" (
  echo.
  echo   ERROR: No se encontro backend\.env
  echo   Crea el archivo con las variables de entorno.
  echo.
  pause
  exit /b 1
)

echo.
echo [4/4] Liberando puertos y arrancando GIAVAL...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 6 /nobreak >nul

echo.
echo   El sistema estara listo en unos segundos.
echo   Abre tu navegador en: http://localhost:5173
echo   Para cerrar presiona Ctrl+C
echo.
echo ================================================
echo.

call npm run dev
pause
 