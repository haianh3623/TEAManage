@echo off
echo 🛠️ Starting TEAManage in DEVELOPMENT mode...

REM Check if .env file exists
if not exist .env (
    echo 📋 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your actual values
)

REM Create development directories
echo 📁 Creating development directories...
if not exist "teamwork_management\logs" mkdir "teamwork_management\logs"
if not exist "mysql\dev-data" mkdir "mysql\dev-data"
if not exist "uploads" mkdir "uploads"

REM Start development stack
echo 🔧 Starting development services...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

echo ⏳ Waiting for services to be ready...

REM Wait for MySQL
echo 🗄️  Waiting for MySQL...
:wait_mysql_dev
timeout /t 2 /nobreak >nul
docker-compose exec mysql mysqladmin ping -h"localhost" --silent >nul 2>&1
if errorlevel 1 (
    echo Waiting for MySQL...
    goto wait_mysql_dev
)

echo ✅ MySQL is ready!

REM Wait for backend
echo 🌐 Waiting for Backend...
:wait_backend_dev
timeout /t 5 /nobreak >nul
curl -f http://localhost:8080/api/actuator/health >nul 2>&1
if errorlevel 1 (
    echo Waiting for Backend...
    goto wait_backend_dev
)

echo ✅ Backend is ready!

echo.
echo 🎉 TEAManage DEVELOPMENT mode is running!
echo.
echo 📊 Development URLs:
echo    Backend API: http://localhost:8080/api
echo    MySQL: localhost:3306 (user: devuser, password: dev_password^)
echo    Frontend: http://localhost (if available^)
echo.
echo 🛠️  Development Tools (use --profile tools^):
echo    phpMyAdmin: http://localhost:8081
echo    Command: docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up -d
echo.
echo 📋 Development commands:
echo    View logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
echo    Stop: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
echo    Backend logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

pause
