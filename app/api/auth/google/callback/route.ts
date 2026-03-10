import { NextRequest, NextResponse } from "next/server"
import { upsertGoogleCalendarIntegration } from "@/lib/workspace-calendar"

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    const state = req.nextUrl.searchParams.get("state") // workspaceId passed as state
    const error = req.nextUrl.searchParams.get("error")

    if (error) {
        return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, req.url))
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL("/dashboard/settings?error=missing_code_or_state", req.url))
    }

    try {
        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`,
                grant_type: "authorization_code",
            }),
        })

        if (!tokenRes.ok) {
            console.error("Token exchange failed:", await tokenRes.text())
            return NextResponse.redirect(new URL("/dashboard/settings?error=token_exchange_failed", req.url))
        }

        const tokens = await tokenRes.json()

        await upsertGoogleCalendarIntegration({
            workspaceId: state,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            expiresInSeconds: typeof tokens.expires_in === "number" ? tokens.expires_in : null,
            calendarId: "primary",
        })

        return NextResponse.redirect(new URL("/dashboard/settings/integrations?success=google_calendar_connected", req.url))
    } catch (error) {
        console.error("OAuth callback error:", error)
        return NextResponse.redirect(new URL("/dashboard/settings/integrations?error=callback_failed", req.url))
    }
}
