import { NextRequest, NextResponse } from "next/server";
import { upsertGoogleCalendarIntegration } from "@/lib/workspace-calendar";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/crm/settings/integrations?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/crm/settings/integrations?error=missing_code_or_state", req.url));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/crm/settings/integrations?error=token_exchange_failed", req.url));
    }

    const tokens = await tokenRes.json();
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

    await upsertGoogleCalendarIntegration({
      workspaceId: state,
      emailAddress: typeof userInfo.email === "string" ? userInfo.email : null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresInSeconds: typeof tokens.expires_in === "number" ? tokens.expires_in : null,
      calendarId: "primary",
    });

    return NextResponse.redirect(new URL("/crm/settings/integrations?success=google_calendar_connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/crm/settings/integrations?error=callback_failed", req.url));
  }
}
