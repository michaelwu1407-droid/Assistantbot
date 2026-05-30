/**
 * QStash — real sub-minute scheduling for delayed lead callbacks.
 *
 * The cron path (/api/cron/scheduled-calls) only sweeps every 5 minutes, so any
 * requested delay under ~5 min silently floors to that. QStash lets us schedule
 * a delayed HTTP callback to the second. When QStash is not configured we return
 * `configured: false` so callers can gracefully fall back to the cron task.
 *
 * Env:
 *   QSTASH_TOKEN                 — required to publish (from Upstash console)
 *   QSTASH_CURRENT_SIGNING_KEY   — required by the receiver to verify signatures
 *   QSTASH_NEXT_SIGNING_KEY      — required by the receiver (key rotation)
 *   NEXT_PUBLIC_APP_URL / APP_URL — public base URL QStash calls back to
 */
import { Client } from "@upstash/qstash";

export type CallbackJobPayload = {
  workspaceId: string;
  contactId?: string | null;
  contactPhone: string;
  contactName?: string | null;
  dealId: string;
  reason: string;
  triggerSource?: string | null;
  callbackKind?: "automatic" | "manual" | null;
  initiatedByUserId?: string | null;
};

export function isQStashConfigured(): boolean {
  return getClient() !== null && Boolean(getAppBaseUrl());
}

function getQStashToken(): string {
  return (process.env.QSTASH_TOKEN || "").trim();
}

function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "")
    .trim()
    .replace(/\/$/, "");
}

let cachedClient: Client | null = null;
function getClient(): Client | null {
  const token = getQStashToken();
  if (!token) return null;
  if (!cachedClient) cachedClient = new Client({ token });
  return cachedClient;
}

/**
 * Schedule a delayed outbound callback via QStash. Returns whether it was
 * published; `configured: false` means the caller should fall back to the cron.
 */
export async function scheduleCallbackViaQStash(params: {
  payload: CallbackJobPayload;
  delaySec: number;
}): Promise<{ configured: boolean; published: boolean; messageId?: string }> {
  const client = getClient();
  const baseUrl = getAppBaseUrl();
  if (!client || !baseUrl) return { configured: false, published: false };

  const res = await client.publishJSON({
    url: `${baseUrl}/api/qstash/callback`,
    body: params.payload,
    delay: Math.max(0, Math.floor(params.delaySec)),
  });

  return { configured: true, published: true, messageId: res.messageId };
}
