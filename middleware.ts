import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

function getSafeOrigin(value?: string) {
  if (!value) return ""

  try {
    return new URL(value).origin
  } catch {
    console.warn("[middleware] Ignoring invalid NEXT_PUBLIC_SUPABASE_URL in CSP")
    return ""
  }
}

const INTERNAL_ONLY_PREFIXES = [
  "/api/test-",
  "/api/check-env",
  "/api/test-env",
  "/api/test-auth",
  "/api/health",
  "/debug-auth",
  "/debug-env",
  "/auth-test",
  "/minimal-auth-test",
  "/test-auth",
  "/test-supabase",
  "/sentry-example-page",
  "/admin/diagnostics",
]

export async function middleware(request: NextRequest) {
  try {
    const url = request.nextUrl
    const { searchParams, pathname } = url

    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_INTERNAL_DEBUG_ROUTES !== "true" &&
      INTERNAL_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ) {
      return NextResponse.rewrite(new URL("/404", request.url), { status: 404 })
    }

    // Refresh Supabase session ONLY on page navigations, NOT APIs, to avoid cold starts on every /api request.
    let response = NextResponse.next({ request })
    if (!pathname.startsWith('/api')) {
      response = await updateSession(request)
    }

    // Fix proxy headers for development
    if (request.headers.get('x-forwarded-host') === 'localhost:3000' &&
      request.headers.get('origin') === 'http://127.0.0.1:51280') {
      response.headers.set('x-forwarded-host', '127.0.0.1:51280')
    }

    // Check for referral parameter
    const refCode = searchParams.get('ref')

    if (refCode) {
      // Middleware runs in the edge runtime, so keep referral handling limited to cookie persistence.
      response.cookies.set('referral_code', refCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })

      return response
    }

    // Add CSP headers. connect-src MUST include Supabase or the browser blocks auth (Failed to fetch).
    const supabaseOrigin = getSafeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const connectSrc = [
      "'self'",
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
      "https://us.i.posthog.com",
      "https://us-assets.i.posthog.com",
      "https://api.openai.com",
      "https://api.stripe.com",
      // Only add Sentry URLs in production
      ...(process.env.NODE_ENV === "production" ? [
        "https://o4510923609079808.ingest.us.sentry.io",
        "https://*.ingest.sentry.io"
      ] : []),
      ...(supabaseOrigin ? [supabaseOrigin] : []),
    ].join(" ")
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com https://maps.googleapis.com https://maps.gstatic.com",
      `connect-src ${connectSrc}`,
      "img-src 'self' data: https://us.i.posthog.com https://us-assets.i.posthog.com https://lh3.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join("; ")

    response.headers.set("Content-Security-Policy", cspHeader)

    return response
  } catch (error) {
    console.error("[middleware] Unhandled middleware failure:", error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
