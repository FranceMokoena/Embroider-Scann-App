#!/bin/bash

echo "🚀 Desktop Admin Backend - Quick Start"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file with your configuration"
    echo ""
fi

echo "🎯 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your configuration"
echo "   2. Start the server: npm run dev"
echo "   3. Test the setup: node test-setup.js"
echo "   4. Access the API at: http://localhost:5001"
echo ""
echo "🔧 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""


