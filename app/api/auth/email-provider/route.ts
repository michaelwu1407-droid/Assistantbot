import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// ─── OAuth Configuration ───────────────────────────────────────────────

function getGmailConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/auth/gmail/callback`,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  };
}

function getOutlookConfig() {
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID ?? "",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET ?? "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/auth/outlook/callback`,
    scopes: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.ReadWrite",
      "https://graph.microsoft.com/User.Read"
    ]
  };
}

// ─── Gmail OAuth Flow ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider || !["gmail", "outlook"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const authUser = await getAuthUser();
  if (!authUser || !authUser.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user from database
  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { id: true, workspaceId: true }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate OAuth URL
  let authUrl: string;
  const config = provider === "gmail" ? getGmailConfig() : getOutlookConfig();

  if (!config.clientId || !config.clientSecret || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json(
      { error: `${provider === "gmail" ? "Gmail" : "Outlook"} integration is not configured` },
      { status: 503 }
    );
  }

  if (provider === "gmail") {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      response_type: "code",
      access_type: "offline", // Important for refresh token
      prompt: "consent", // Force consent to get refresh token
      state: JSON.stringify({ userId: user.id, provider: "gmail" })
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      response_type: "code",
      response_mode: "query",
      state: JSON.stringify({ userId: user.id, provider: "outlook" })
    });
    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  return NextResponse.json({ authUrl });
}
