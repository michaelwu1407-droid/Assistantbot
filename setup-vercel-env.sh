#!/bin/bash

# 🚨 Vercel Environment Setup Script
echo "🔧 Setting up Vercel environment variables..."

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📝 Adding environment variables to Vercel..."

# Read from .env.local and add to Vercel
if [ -f ".env.local" ]; then
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ $line =~ ^[[:space:]]*# ]] && continue
        [[ -z "$line" ]] && continue
        
        # Split key=value
        key=$(echo "$line" | cut -d'=' -f1)
        value=$(echo "$line" | cut -d'=' -f2-)
        
        # Add to Vercel
        echo "Adding $key..."
        echo "$value" | vercel env add "$key" --prod
    done < .env.local
    
    echo "✅ Environment variables added to Vercel!"
    echo ""
    echo "🚀 Now redeploying..."
    vercel --prod
    
else
    echo "❌ .env.local file not found!"
    exit 1
fi
