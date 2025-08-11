@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting TEAManage (MySQL + Backend + Nginx%1)...
echo.

REM Create folders if missing
if not exist "teamwork_management\logs" mkdir "teamwork_management\logs"
if not exist "mysql\data" mkdir "mysql\data"

REM Build & start with override (adds nginx). Use profile frontend if asked.
if "%1"=="--frontend" (
  echo ▶ Using frontend profile
  docker-compose -f docker-compose.yml -f docker-compose.yml --profile frontend up -d --build
) else (
  docker-compose -f docker-compose.yml -f docker-compose.yml up -d --build
)

if errorlevel 1 (
  echo ❌ docker-compose failed. Check your Docker Desktop and config.
  goto :end
)

echo.
echo ⏳ Waiting for Nginx to serve frontend (http://localhost/)
:wait_nginx
for /f %%i in ('curl -s -o NUL -w "%%{http_code}" http://localhost/') do set CODE=%%i
if not "%CODE%"=="200" (
  echo   ... Waiting for frontend via Nginx
  timeout /t 3 >nul
  goto wait_nginx
)

echo.
echo ⏳ Waiting for Backend health via Nginx (http://localhost/api/hello)
:wait_api
for /f %%i in ('curl -s -o NUL -w "%%{http_code}" http://localhost/api/hello') do set ACODE=%%i
if not "%ACODE%"=="200" (
  echo   ... Waiting for backend
  timeout /t 3 >nul
  goto wait_api
)

echo.
echo ✅ All services are ready!
start http://localhost/

:end
endlocal
