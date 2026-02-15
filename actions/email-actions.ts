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
  workspaceId: string,
  accessToken: string
): Promise<EmailSyncResult> {
  try {
    // 1. Fetch recent messages from Gmail API
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than:1d",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      return {
        success: false,
        synced: 0,
        activitiesCreated: 0,
        error: `Gmail API error: ${listRes.statusText}`
      };
    }

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

    let synced = 0;
    let activitiesCreated = 0;

    // 2. Fetch each message details to get headers
    for (const msgId of messageIds) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) continue;

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
      const snippet = msgData.snippet || "";

      // Extract email from "Name <email>" format
      const emailMatch = fromHeader.match(/<(.+?)>/);
      const senderEmail = emailMatch ? emailMatch[1] : fromHeader;

      // 3. Match sender to CRM contact
      const contact = await db.contact.findFirst({
        where: { workspaceId, email: senderEmail }
      });

      if (contact) {
        await db.activity.create({
          data: {
            type: "EMAIL",
            title: subject,
            content: `From: ${fromHeader}\n\n${snippet}`,
            contactId: contact.id,
          }
        });
        activitiesCreated++;
      }
      synced++;
    }

    return { success: true, synced, activitiesCreated };
  } catch (error) {
    console.error("Gmail sync error:", error);
    return {
      success: false,
      synced: 0,
      activitiesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
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
  workspaceId: string,
  accessToken: string
): Promise<EmailSyncResult> {
  try {
    // 1. Fetch recent messages from Microsoft Graph
    // Top 50, newest first
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,bodyPreview,receivedDateTime',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        synced: 0,
        activitiesCreated: 0,
        error: `Outlook API error: ${response.statusText}`
      };
    }

    const data = await response.json();
    const messages = data.value || [];

    let synced = 0;
    let activitiesCreated = 0;

    for (const msg of messages) {
      const senderEmail = msg.from?.emailAddress?.address;
      if (!senderEmail) continue;

      // 2. Match to contact
      const contact = await db.contact.findFirst({
        where: { workspaceId, email: senderEmail }
      });

      if (contact) {
        await db.activity.create({
          data: {
            type: "EMAIL",
            title: msg.subject || "No Subject",
            content: `From: ${msg.from.emailAddress.name} <${senderEmail}>\n\n${msg.bodyPreview}`,
            contactId: contact.id,
          }
        });
        activitiesCreated++;
      }
      synced++;
    }

    return { success: true, synced, activitiesCreated };
  } catch (error) {
    console.error("Outlook sync error:", error);
    return {
      success: false,
      synced: 0,
      activitiesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
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
