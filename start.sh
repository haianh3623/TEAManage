#!/bin/bash

echo "🚀 Starting TEAManage application with Docker Compose..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual values (especially Google OAuth credentials)"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p teamwork_management/logs
mkdir -p mysql/data

# Build and start services
echo "🔧 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for MySQL to be ready
echo "🗄️  Waiting for MySQL..."
until docker-compose exec mysql mysqladmin ping -h"localhost" --silent; do
    echo "Waiting for MySQL..."
    sleep 2
done

echo "✅ MySQL is ready!"

# Wait for backend to be ready
echo "🌐 Waiting for Backend..."
until curl -f http://localhost:8080/api/actuator/health > /dev/null 2>&1; do
    echo "Waiting for Backend..."
    sleep 5
done

echo "✅ Backend is ready!"

echo ""
echo "🎉 TEAManage is now running!"
echo ""
echo "📊 Service URLs:"
echo "   Backend API: http://localhost:8080/api"
echo "   MySQL: localhost:3307 (user: teamuser, password: teampassword)"
echo "   Frontend: http://localhost (if using --profile frontend)"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   View backend logs: docker-compose logs -f backend"
echo "   View database logs: docker-compose logs -f mysql"
echo ""
echo "🔧 To start with frontend:"
echo "   docker-compose --profile frontend up -d"
