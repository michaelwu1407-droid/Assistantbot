import { NextRequest, NextResponse } from "next/server";
import { storeXeroTokens } from "@/lib/xero";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // workspaceId passed as state
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?error=${error}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings/integrations?error=missing_code_or_state",
        req.url
      )
    );
  }

  const clientId = process.env.XERO_CLIENT_ID ?? "";
  const clientSecret = process.env.XERO_CLIENT_SECRET ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/xero/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch(
      "https://identity.xero.com/connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenRes.ok) {
      console.error("[xero-callback] Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings/integrations?error=token_exchange_failed",
          req.url
        )
      );
    }

    const tokens = await tokenRes.json();

    // 2. Fetch the tenant (organisation) ID from Xero connections
    const connectionsRes = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    let tenantId = "";
    if (connectionsRes.ok) {
      const connections = await connectionsRes.json();
      // Use the first connected organisation
      tenantId = connections[0]?.tenantId ?? "";
    }

    if (!tenantId) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/settings/integrations?error=no_xero_organisation",
          req.url
        )
      );
    }

    // 3. Store encrypted tokens in workspace settings
    await storeXeroTokens(state, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      tenant_id: tenantId,
    });

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings/integrations?success=xero_connected",
        req.url
      )
    );
  } catch (error) {
    console.error("[xero-callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings/integrations?error=callback_failed",
        req.url
      )
    );
  }
}
