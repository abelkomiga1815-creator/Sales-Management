#!/bin/bash

# Shop Ledger PWA - Quick Start Script

echo "🚀 Shop Ledger PWA - Quick Start"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << 'EOF'
DEBUG=True
SECRET_KEY=django-insecure-change-this-in-production
DB_NAME=shop_ledger_db
DB_USER=shop_ledger_user
DB_PASSWORD=shop_ledger_password
DB_HOST=db
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
EOF
    echo "✅ .env created with default values"
    echo "⚠️  Please update .env with your settings before production deployment"
fi

echo ""
echo "Starting Docker services..."
docker-compose up -d

echo ""
echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo ""
echo "Running migrations..."
docker-compose exec -T web python manage.py migrate

echo ""
echo "Collecting static files..."
docker-compose exec -T web python manage.py collectstatic --noinput

echo ""
echo "✅ Shop Ledger PWA is running!"
echo ""
echo "📱 Access the application:"
echo "   Main App:  http://localhost:8000"
echo "   Admin:     http://localhost:8000/admin"
echo ""
echo "👤 Create a superuser:"
echo "   docker-compose exec web python manage.py createsuperuser"
echo ""
echo "📖 For more information, see README.md"
echo ""
echo "🛑 To stop services: docker-compose down"
