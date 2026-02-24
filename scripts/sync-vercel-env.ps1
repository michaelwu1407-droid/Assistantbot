# Sync environment variables from Vercel to local .env
Write-Host "🔄 Syncing environment variables from Vercel..."

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "❌ Vercel CLI not found. Please install it first:"
    Write-Host "npm i -g vercel"
    exit 1
}

# Pull environment variables from Vercel
Write-Host "📥 Pulling environment variables from Vercel..."
$result = vercel env pull .env.local

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Environment variables synced successfully!"
    Write-Host "📁 Variables saved to .env.local"
    
    # Show what was pulled
    Write-Host ""
    Write-Host "📋 Pulled variables:"
    vercel env ls
} else {
    Write-Host "❌ Failed to pull environment variables"
    Write-Host "Make sure you are logged into Vercel and have the correct project selected"
    exit 1
}
