import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/oauth-state";
import {
  finalizeEmailIntegrationSetup,
  normalizeEmailProvider,
  resolveMicrosoftUserEmail,
  upsertEmailIntegrationFromOAuth,
} from "@/lib/email-integrations";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=missing_params`,
    );
  }

  const verified = verifyOAuthState(state);
  if (!verified.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=invalid_state`,
    );
  }

  const userId = typeof verified.payload.userId === "string" ? verified.payload.userId : "";
  const provider = normalizeEmailProvider(
    typeof verified.payload.provider === "string" ? verified.payload.provider : "",
  );
  if (!userId || provider !== "outlook") {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=invalid_state`,
    );
  }

  try {
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

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const userInfo = await userInfoResponse.json();
    const emailAddress = resolveMicrosoftUserEmail(userInfo);
    if (!emailAddress) {
      throw new Error("Unable to resolve Outlook email address");
    }

    const integration = await upsertEmailIntegrationFromOAuth({
      userId,
      provider,
      emailAddress,
      accessToken: tokenData.access_token,
      refreshToken: typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : null,
      expiresInSeconds: typeof tokenData.expires_in === "number" ? tokenData.expires_in : null,
    });

    let warning: string | null = null;
    try {
      await finalizeEmailIntegrationSetup({
        userId,
        provider,
        integrationId: integration.id,
      });
    } catch (setupError) {
      console.error("Outlook OAuth setup warning:", setupError);
      warning = "outlook_automation_setup_incomplete";
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?success=${provider}_connected${warning ? `&warning=${warning}` : ""}`,
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=oauth_failed`,
    );
  }
}
