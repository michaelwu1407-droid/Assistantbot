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
  if (!userId || !provider) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=invalid_state`,
    );
  }

  try {
    const tokenEndpoint =
      provider === "gmail"
        ? "https://oauth2.googleapis.com/token"
        : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const redirectUri =
      provider === "gmail"
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`;

    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: provider === "gmail" ? process.env.GMAIL_CLIENT_ID! : process.env.OUTLOOK_CLIENT_ID!,
        client_secret:
          provider === "gmail" ? process.env.GMAIL_CLIENT_SECRET! : process.env.OUTLOOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    let emailAddress: string | null = null;
    if (provider === "gmail") {
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
      );
      const userInfo = await userInfoResponse.json();
      emailAddress = typeof userInfo.email === "string" ? userInfo.email : null;
    } else {
      const userInfoResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      );
      const userInfo = await userInfoResponse.json();
      emailAddress = resolveMicrosoftUserEmail(userInfo);
    }

    if (!emailAddress) {
      throw new Error("Unable to resolve provider email address");
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
      console.error("OAuth callback setup warning:", setupError);
      warning = `${provider}_automation_setup_incomplete`;
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?success=${provider}_connected&focus=lead_channels${warning ? `&warning=${warning}` : ""}`,
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/crm/settings/integrations?error=oauth_failed`,
    );
  }
}
