#!/bin/bash

# Sync environment variables from Vercel to local .env
echo "🔄 Syncing environment variables from Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Pull environment variables from Vercel
echo "📥 Pulling environment variables from Vercel..."
vercel env pull .env.local

if [ $? -eq 0 ]; then
    echo "✅ Environment variables synced successfully!"
    echo "📁 Variables saved to .env.local"
    
    # Show what was pulled
    echo ""
    echo "📋 Pulled variables:"
    vercel env ls
else
    echo "❌ Failed to pull environment variables"
    echo "Make sure you're logged into Vercel and have the correct project selected"
    exit 1
fi
