import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript build errors are no longer ignored
  // This ensures type safety and catches potential runtime issues
  turbopack: {
    root: __dirname,
  },
  // Allow cross-origin requests from development proxy and fix server actions
  allowedDevOrigins: ['127.0.0.1:51280', 'localhost:3000'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  /** Old /dashboard/* URLs → /crm/* (bookmarks, emails, OAuth redirects). */
  async redirects() {
    return [
      { source: '/dashboard', destination: '/crm/dashboard', permanent: true },
      { source: '/dashboard/:path*', destination: '/crm/:path*', permanent: true },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "acecap",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Add Content Security Policy headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://us.i.posthog.com https://us-assets.i.posthog.com https://maps.googleapis.com https://maps.gstatic.com",
              "worker-src 'self' blob:",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

