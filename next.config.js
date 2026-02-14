/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: true
  },
  typescript: {
    // !! WARN: This is not recommended for production
    // !! WARN: Can cause build performance issues
    // !! WARN: May cause compatibility issues
    tsconfigPath: './tsconfig.json'
  },
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL
  }
}

export default nextConfig;
