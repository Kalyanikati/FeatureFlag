#!/bin/bash

echo "🚀 Starting Feature Flag Management Platform..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

cd "$(dirname "$0")/infra" || exit

# Start services
echo "📦 Building and starting containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo ""
echo "✅ System Started! Services are running at:"
echo ""
echo "   🎨 Dashboard:        http://localhost:3000"
echo "   🚀 API:              http://localhost:8000"
echo "   🛒 E-commerce Mock:  http://localhost:8001"
echo ""
echo "📊 Database & Cache:"
echo "   PostgreSQL: localhost:5432 (user: ff_admin, password: ff_secure_pass123)"
echo "   Redis:      localhost:6379"
echo ""
echo "🎯 Quick Start:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Create a new flag (Key: test_flag, Rollout: 25%)"
echo "   3. Check E-commerce Integration to see real-time sync"
echo "   4. Try updating the flag and see versions"
echo "   5. Rollback to previous version to test recovery"
echo ""
echo "📚 API Examples:"
echo "   curl http://localhost:8000/api/v1/flags"
echo "   curl http://localhost:8000/sdk/flags"
echo ""
echo "🛑 To stop: cd infra && docker-compose down"
echo "🔄 To restart: cd infra && docker-compose restart"
echo "🗑️  To clean: cd infra && docker-compose down -v"
echo ""
echo "📖 For detailed docs, check README.md"
echo ""
