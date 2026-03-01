import { NextRequest, NextResponse } from "next/server"
import { trackReferralClick } from "@/actions/referral-actions"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Refresh Supabase session so login/logout in another browser or tab stays in sync
  let response = await updateSession(request)

  const url = request.nextUrl
  const { searchParams } = url

  // Fix proxy headers for development
  if (request.headers.get('x-forwarded-host') === 'localhost:3000' &&
    request.headers.get('origin') === 'http://127.0.0.1:51280') {
    response.headers.set('x-forwarded-host', '127.0.0.1:51280')
  }

  // Check for referral parameter
  const refCode = searchParams.get('ref')

  if (refCode) {
    // Track the referral click
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referrer = request.headers.get('referer') || 'direct'

    // Extract UTM parameters
    const utmSource = searchParams.get('utm_source') || undefined
    const utmMedium = searchParams.get('utm_medium') || undefined
    const utmCampaign = searchParams.get('utm_campaign') || undefined

    try {
      await trackReferralClick({
        referralCode: refCode,
        ipAddress,
        userAgent,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign
      })
    } catch (error) {
      console.error("Error tracking referral click:", error)
      // Don't block the request if tracking fails
    }

    // Store referral info in session cookie for later use
    response.cookies.set('referral_code', refCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    return response
  }

  // Add CSP headers. connect-src MUST include Supabase or the browser blocks auth (Failed to fetch).
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "";
  const connectSrc = [
    "'self'",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://api.openai.com",
    "https://api.retellai.com",
    "https://api.stripe.com",
    // Only add Sentry URLs in production
    ...(process.env.NODE_ENV === "production" ? [
      "https://o4510923609079808.ingest.us.sentry.io",
      "https://*.ingest.sentry.io"
    ] : []),
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ].join(" ");
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com https://maps.googleapis.com https://maps.gstatic.com",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: https://us.i.posthog.com https://us-assets.i.posthog.com https://lh3.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);

  return response
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
