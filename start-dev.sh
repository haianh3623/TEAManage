#!/bin/bash

echo "🛠️ Starting TEAManage in DEVELOPMENT mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual values"
fi

# Create development directories
echo "📁 Creating development directories..."
mkdir -p teamwork_management/logs
mkdir -p mysql/dev-data
mkdir -p uploads

# Start development stack
echo "🔧 Starting development services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for MySQL
echo "🗄️  Waiting for MySQL..."
until docker-compose exec mysql mysqladmin ping -h"localhost" --silent; do
    echo "Waiting for MySQL..."
    sleep 2
done

echo "✅ MySQL is ready!"

# Wait for backend
echo "🌐 Waiting for Backend..."
until curl -f http://localhost:8080/api/actuator/health > /dev/null 2>&1; do
    echo "Waiting for Backend..."
    sleep 5
done

echo "✅ Backend is ready!"

echo ""
echo "🎉 TEAManage DEVELOPMENT mode is running!"
echo ""
echo "📊 Development URLs:"
echo "   Backend API: http://localhost:8080/api"
echo "   MySQL: localhost:3306 (user: devuser, password: dev_password)"
echo "   Frontend: http://localhost (if available)"
echo ""
echo "🛠️  Development Tools (use --profile tools):"
echo "   phpMyAdmin: http://localhost:8081"
echo "   Command: docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile tools up -d"
echo ""
echo "📋 Development commands:"
echo "   View logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down"
echo "   Backend logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend"
