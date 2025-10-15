#!/bin/bash

# Vibecode Proxy - Quick Deploy Script
# Usage: ./deploy.sh

echo "🚀 Vibecode Proxy - Quick Deploy"
echo "================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Vibecode Proxy"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Configuration Steps:"
echo "----------------------"
echo "1. Make sure you have a Vercel account (https://vercel.com)"
echo "2. Make sure your Google Apps Script is deployed as Web App with 'Anyone' access"
echo ""
read -p "Press Enter to continue with deployment..."

# Deploy with Vercel
echo ""
echo "🚀 Starting Vercel deployment..."
echo "Follow the prompts to complete deployment:"
echo ""
vercel

echo ""
echo "⚠️  IMPORTANT: After deployment, you MUST:"
echo "1. Go to your Vercel Dashboard"
echo "2. Navigate to Storage tab"
echo "3. Create a KV database and connect it to your project"
echo "4. Redeploy the project after connecting KV database"
echo ""
echo "📖 Full documentation: https://github.com/yourusername/vibecode-proxy"
echo ""
echo "✅ Deployment script completed!"
