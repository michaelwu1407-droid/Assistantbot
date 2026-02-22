import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";

// ─── OAuth Configuration ───────────────────────────────────────────────

const GMAIL_CONFIG = {
  clientId: process.env.GMAIL_CLIENT_ID!,
  clientSecret: process.env.GMAIL_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`,
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
};

const OUTLOOK_CONFIG = {
  clientId: process.env.OUTLOOK_CLIENT_ID!,
  clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`,
  scopes: [
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/User.Read"
  ]
};

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

  if (provider === "gmail") {
    const params = new URLSearchParams({
      client_id: GMAIL_CONFIG.clientId,
      redirect_uri: GMAIL_CONFIG.redirectUri,
      scope: GMAIL_CONFIG.scopes.join(" "),
      response_type: "code",
      access_type: "offline", // Important for refresh token
      prompt: "consent", // Force consent to get refresh token
      state: JSON.stringify({ userId: user.id, provider: "gmail" })
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      client_id: OUTLOOK_CONFIG.clientId,
      redirect_uri: OUTLOOK_CONFIG.redirectUri,
      scope: OUTLOOK_CONFIG.scopes.join(" "),
      response_type: "code",
      response_mode: "query",
      state: JSON.stringify({ userId: user.id, provider: "outlook" })
    });
    authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  return NextResponse.json({ authUrl });
}
