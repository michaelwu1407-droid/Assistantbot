#!/bin/bash

# 🚀 Assistantbot Production Setup Script
# This script helps you set up Clerk authentication for production

echo "🔐 Setting up Assistantbot for production..."

# Check if Clerk keys are configured
if grep -q "pk_test_placeholder_key" .env.local; then
    echo ""
    echo "❌ ERROR: Clerk keys not configured!"
    echo ""
    echo "📋 SETUP STEPS:"
    echo "1. Go to: https://dashboard.clerk.com"
    echo "2. Navigate to your application -> API Keys"
    echo "3. Copy your Publishable Key (starts with pk_test_ or pk_live_)"
    echo "4. Copy your Secret Key (starts with sk_test_ or sk_live_)"
    echo ""
    echo "📝 UPDATE YOUR .env.local FILE:"
    echo "Replace these lines:"
    echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=\"pk_test_placeholder_key\""
    echo "CLERK_SECRET_KEY=\"sk_test_placeholder_key\""
    echo ""
    echo "With your actual keys from Clerk dashboard."
    echo ""
    exit 1
else
    echo "✅ Clerk keys are configured!"
    echo ""
    echo "🔍 Next steps:"
    echo "1. Test locally: npm run dev"
    echo "2. Build for production: npm run build"
    echo "3. Deploy to Vercel: vercel --prod"
    echo ""
    echo "📊 Current configuration:"
    grep "CLERK" .env.local
fi

echo ""
echo "🎯 Ready to go!"
