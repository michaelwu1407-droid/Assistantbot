import { NextRequest, NextResponse } from "next/server"

/**
 * Google OAuth callback. Exchanges the code for an id_token, then redirects
 * to /auth/google-done with the token in the fragment so the client can
 * call Supabase signInWithIdToken and set the session.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const nextPath = searchParams.get("state") || "/setup"
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", baseUrl))
  }

  const redirectUri = `${baseUrl}/api/auth/google-signin/callback`
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/auth?error=config", baseUrl))
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error("Google token exchange failed:", err)
      return NextResponse.redirect(new URL("/auth?error=token_exchange_failed", baseUrl))
    }

    const data = (await tokenRes.json()) as { id_token?: string; access_token?: string }
    const idToken = data.id_token
    const accessToken = data.access_token

    if (!idToken) {
      return NextResponse.redirect(new URL("/auth?error=no_id_token", baseUrl))
    }

    // Redirect to client page with tokens in fragment (not sent to server)
    const doneUrl = new URL("/auth/google-done", baseUrl)
    const params = new URLSearchParams({ id_token: idToken, next: nextPath })
    if (accessToken) params.set("access_token", accessToken)
    doneUrl.hash = params.toString()
    return NextResponse.redirect(doneUrl.toString())
  } catch (e) {
    console.error("Google sign-in callback error:", e)
    return NextResponse.redirect(new URL("/auth?error=callback_failed", baseUrl))
  }
}
