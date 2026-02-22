import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

// ─── Gmail OAuth Callback ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=missing_params`
    );
  }

  try {
    // Parse state to get user info
    const { userId, provider } = JSON.parse(state);

    // Exchange authorization code for tokens
    let tokenData;
    
    if (provider === "gmail") {
      // Exchange code for Gmail tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
        }),
      });

      tokenData = await tokenResponse.json();
    } else {
      // Exchange code for Outlook tokens
      const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`,
        }),
      });

      tokenData = await tokenResponse.json();
    }

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get user's email address
    let userEmail;
    if (provider === "gmail") {
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
      );
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.email;
    } else {
      const userInfoResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me?$select=mail`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );
      const userInfo = await userInfoResponse.json();
      userEmail = userInfo.mail;
    }

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Store encrypted tokens in database
    await db.emailIntegration.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      update: {
        emailAddress: userEmail,
        accessToken: encrypt(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        tokenExpiry,
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        provider,
        emailAddress: userEmail,
        accessToken: encrypt(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        tokenExpiry,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?success=${provider}_connected`
    );

  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/integrations?error=oauth_failed`
    );
  }
}
