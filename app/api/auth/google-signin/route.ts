import { NextRequest, NextResponse } from "next/server"

/**
 * Starts Google sign-in using our own redirect URI so Google shows
 * "Earlymark.ai" (or your app URL) instead of the Supabase project URL.
 * Add this redirect URI in Google Cloud Console:
 * - Production: https://earlymark.ai/api/auth/google-signin/callback
 * - Local: http://localhost:3000/api/auth/google-signin/callback
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const redirectUri = `${baseUrl}/api/auth/google-signin/callback`
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID is not set")
    return NextResponse.redirect(new URL("/auth?error=config", req.url))
  }

  const state = req.nextUrl.searchParams.get("next") || ""
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    ...(state && { state }),
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(googleAuthUrl)
}
