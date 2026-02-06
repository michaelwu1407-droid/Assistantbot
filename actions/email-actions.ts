"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  date: Date;
  threadId: string;
  isRead: boolean;
}

export interface EmailSyncResult {
  success: boolean;
  synced: number;
  activitiesCreated: number;
  error?: string;
}

// ─── Gmail Sync ─────────────────────────────────────────────────────

/**
 * Sync emails from Gmail.
 *
 * STUB: In production, this would:
 * 1. Use OAuth2 token stored in workspace settings
 * 2. Call Gmail API to list recent messages
 * 3. Match senders to CRM contacts by email
 * 4. Auto-log as EMAIL activities via autoLogActivity()
 *
 * Requires:
 * - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env
 * - Per-workspace OAuth2 refresh token (from OAuth flow)
 */
export async function syncGmail(
  _workspaceId: string,
  _accessToken?: string
): Promise<EmailSyncResult> {
  // TODO: Replace with actual Gmail API call
  // const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  // const messages = await gmail.users.messages.list({ userId: 'me', maxResults: 50, q: 'newer_than:1d' });

  // For now, return a stub indicating the integration point
  const _contacts = await db.contact.findMany({
    where: { workspaceId: _workspaceId, email: { not: null } },
    select: { id: true, email: true, name: true },
  });

  // In production: for each new email, match sender to contact and create activity
  // const matchedEmails = emails.filter(e => contacts.some(c => c.email === e.from));
  // for (const email of matchedEmails) {
  //   await autoLogActivity({ type: 'EMAIL', ... });
  // }

  return {
    success: true,
    synced: 0,
    activitiesCreated: 0,
    error: "Gmail sync not configured. Set up Google OAuth and provide access token.",
  };
}

/**
 * Sync emails from Microsoft Outlook / Office 365.
 *
 * STUB: In production, this would use Microsoft Graph API.
 *
 * Requires:
 * - AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env
 * - Per-workspace OAuth2 refresh token
 */
export async function syncOutlook(
  _workspaceId: string,
  _accessToken?: string
): Promise<EmailSyncResult> {
  // TODO: Replace with actual Microsoft Graph API call
  // const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
  //   headers: { Authorization: `Bearer ${accessToken}` }
  // });

  return {
    success: true,
    synced: 0,
    activitiesCreated: 0,
    error: "Outlook sync not configured. Set up Azure OAuth and provide access token.",
  };
}

/**
 * Get the OAuth authorization URL for Gmail.
 * Frontend redirects user here to grant access.
 */
export async function getGmailAuthUrl(redirectUri: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return "";

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
  ];

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(" "))}&access_type=offline&prompt=consent`;
}

/**
 * Get the OAuth authorization URL for Microsoft Outlook.
 */
export async function getOutlookAuthUrl(redirectUri: string): Promise<string> {
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!clientId) return "";

  const scopes = ["Mail.Read", "Mail.ReadBasic", "offline_access"];

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(" "))}`;
}

/**
 * Process incoming email webhook (for real-time sync).
 * Called by Gmail push notifications or Microsoft Graph subscriptions.
 */
export async function processEmailWebhook(
  workspaceId: string,
  payload: {
    from: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
  }
): Promise<{ success: boolean; activityId?: string }> {
  // Match sender to a contact
  const contact = await db.contact.findFirst({
    where: { workspaceId, email: payload.from },
  });

  if (!contact) {
    return { success: false };
  }

  // Find the most active deal for this contact
  const deal = await db.deal.findFirst({
    where: {
      contactId: contact.id,
      stage: { notIn: ["WON", "LOST"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Auto-log as activity
  const activity = await db.activity.create({
    data: {
      type: "EMAIL",
      title: `Email: ${payload.subject}`,
      content: payload.snippet,
      contactId: contact.id,
      dealId: deal?.id,
    },
  });

  return { success: true, activityId: activity.id };
}
