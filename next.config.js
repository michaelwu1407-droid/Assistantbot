/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript build errors are no longer ignored
  // This ensures type safety and catches potential runtime issues
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
