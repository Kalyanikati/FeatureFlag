@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Feature Flag Management Platform...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker and try again.
    exit /b 1
)

REM Change to infra directory
cd /d "%~dp0infra" || exit /b 1

REM Start services
echo 📦 Building and starting containers...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak

REM Display status
echo.
echo ✅ System Started! Services are running at:
echo.
echo    🎨 Dashboard:        http://localhost:3000
echo    🚀 API:              http://localhost:8000
echo    🛒 E-commerce Mock:  http://localhost:8001
echo.
echo 📊 Database ^& Cache:
echo    PostgreSQL: localhost:5432 (user: ff_admin, password: ff_secure_pass123)
echo    Redis:      localhost:6379
echo.
echo 🎯 Quick Start:
echo    1. Open http://localhost:3000 in your browser
echo    2. Create a new flag (Key: test_flag, Rollout: 25%%)
echo    3. Check E-commerce Integration to see real-time sync
echo    4. Try updating the flag and see versions
echo    5. Rollback to previous version to test recovery
echo.
echo 🛑 To stop: cd infra ^&^& docker-compose down
echo 🔄 To restart: cd infra ^&^& docker-compose restart
echo 🗑️  To clean: cd infra ^&^& docker-compose down -v
echo.
echo 📖 For detailed docs, check README.md
echo.
pause
