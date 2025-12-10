#!/bin/bash
# Quick Start Script for Raksha Ireland Mock API Server

echo "🚀 Setting up Raksha Ireland Mock API Server..."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the backend directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules/express" ]; then
    echo "📦 Installing Express and CORS..."
    npm install express cors --save-dev
    echo ""
fi

# Start the server
echo "🎯 Starting mock server on http://localhost:3000..."
echo ""
node local-mock-server.js
