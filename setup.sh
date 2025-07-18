#!/bin/bash

# Pammboo2 Broker Consent Workflow Setup Script
set -e

echo "🚀 Setting up Pammboo2 Broker Consent Workflow..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required dependencies
echo "📋 Checking dependencies..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "✅ Created .env file. Please review and update the values as needed."
else
    echo "✅ .env file already exists"
fi

# Setup mode selection
echo ""
echo "Please select setup mode:"
echo "1) Production (recommended for deployment)"
echo "2) Development (includes dev tools and hot reload)"
echo "3) Build only (just build the application)"

read -p "Enter your choice (1-3): " setup_mode

case $setup_mode in
    1)
        echo "🏭 Setting up for production..."
        docker-compose build
        echo "⚡ Starting production services..."
        docker-compose up -d
        echo ""
        echo "✅ Production setup complete!"
        echo "🌐 Application: http://localhost:${HOST_PORT:-3000}"
        echo "🔍 Health check: http://localhost:${HOST_PORT:-3000}/api/hello"
        ;;
    2)
        echo "🛠️ Setting up for development..."
        
        # Install local dependencies for development
        if command_exists npm; then
            echo "📦 Installing npm dependencies..."
            npm install
        else
            echo "⚠️ npm not found, skipping local dependency installation"
        fi
        
        # Build and start development services
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
        echo "⚡ Starting development services..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
        
        echo ""
        echo "✅ Development setup complete!"
        echo "🌐 Application: http://localhost:3000"
        echo "🔧 Prisma Studio: http://localhost:${PRISMA_STUDIO_PORT:-5555}"
        echo "🗄️ phpMyAdmin: http://localhost:${PHPMYADMIN_PORT:-8080}"
        echo "🔍 Health check: http://localhost:3000/api/hello"
        ;;
    3)
        echo "🔨 Building application..."
        docker-compose build
        echo "✅ Build complete!"
        echo "To start services, run: docker-compose up -d"
        ;;
    *)
        echo "❌ Invalid selection. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 Quick Start Guide:"
echo "━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Broker Consent Workflow URLs:"
echo "• Login: /broker-consent-services?userId=123&accountId=456&brokerId=789&strategyId=101"
echo "• Consent: /approve-consent-process"  
echo "• Testing: /accept-consent-dev-test/dashboard"
echo ""
echo "Management Commands:"
echo "• View logs: docker-compose logs -f"
echo "• Stop services: docker-compose down"
echo "• Database shell: docker-compose exec database mysql -u pammboo_user -p pammboo2"
echo ""
echo "📖 For detailed documentation, see README.md"
echo ""
echo "🎉 Setup completed successfully!"