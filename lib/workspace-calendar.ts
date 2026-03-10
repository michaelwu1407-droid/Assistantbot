import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";

const GOOGLE_PROVIDER = "google";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_EVENT_DURATION_MINUTES = 60;

type GoogleCalendarIntegrationRecord = {
  id: string;
  workspaceId: string;
  provider: string;
  calendarId: string;
  emailAddress: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  metadata: unknown;
  isActive: boolean;
  lastSyncAt: Date | null;
};

function getGoogleCalendarRedirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`;
}

async function getGoogleCalendarIntegration(workspaceId: string): Promise<GoogleCalendarIntegrationRecord | null> {
  return db.workspaceCalendarIntegration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: GOOGLE_PROVIDER,
      },
    },
  });
}

async function refreshGoogleCalendarAccessToken(integration: GoogleCalendarIntegrationRecord): Promise<string> {
  if (!integration.refreshToken) {
    throw new Error("Google Calendar refresh token is missing");
  }

  const refreshToken = decrypt(integration.refreshToken);
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google Calendar token");
  }

  const tokenData = await response.json();
  const accessToken = tokenData.access_token as string;
  const nextRefreshToken = typeof tokenData.refresh_token === "string" ? tokenData.refresh_token : refreshToken;
  const tokenExpiry = typeof tokenData.expires_in === "number"
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await db.workspaceCalendarIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(accessToken),
      refreshToken: nextRefreshToken ? encrypt(nextRefreshToken) : integration.refreshToken,
      tokenExpiry,
      lastSyncAt: new Date(),
      isActive: true,
    },
  });

  return accessToken;
}

export async function getGoogleCalendarAccessToken(workspaceId: string): Promise<string | null> {
  const integration = await getGoogleCalendarIntegration(workspaceId);
  if (!integration?.isActive) {
    return null;
  }

  if (integration.tokenExpiry && integration.tokenExpiry.getTime() <= Date.now() + 60_000) {
    return refreshGoogleCalendarAccessToken(integration);
  }

  return decrypt(integration.accessToken);
}

export async function upsertGoogleCalendarIntegration(input: {
  workspaceId: string;
  emailAddress?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  calendarId?: string;
}) {
  const tokenExpiry = input.expiresInSeconds
    ? new Date(Date.now() + input.expiresInSeconds * 1000)
    : null;

  await db.workspaceCalendarIntegration.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: input.workspaceId,
        provider: GOOGLE_PROVIDER,
      },
    },
    update: {
      calendarId: input.calendarId || "primary",
      emailAddress: input.emailAddress || null,
      accessToken: encrypt(input.accessToken),
      refreshToken: input.refreshToken ? encrypt(input.refreshToken) : undefined,
      tokenExpiry,
      isActive: true,
      lastSyncAt: new Date(),
    },
    create: {
      workspaceId: input.workspaceId,
      provider: GOOGLE_PROVIDER,
      calendarId: input.calendarId || "primary",
      emailAddress: input.emailAddress || null,
      accessToken: encrypt(input.accessToken),
      refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
      tokenExpiry,
      isActive: true,
      lastSyncAt: new Date(),
    },
  });
}

export async function disconnectGoogleCalendarIntegration(workspaceId: string) {
  await db.workspaceCalendarIntegration.deleteMany({
    where: {
      workspaceId,
      provider: GOOGLE_PROVIDER,
    },
  });
}

export async function getWorkspaceCalendarStatus(workspaceId: string) {
  const integration = await getGoogleCalendarIntegration(workspaceId);
  if (!integration) {
    return {
      connected: false,
      provider: GOOGLE_PROVIDER,
      emailAddress: null,
      lastSyncAt: null,
      calendarId: null,
    };
  }

  return {
    connected: integration.isActive,
    provider: integration.provider,
    emailAddress: integration.emailAddress,
    lastSyncAt: integration.lastSyncAt,
    calendarId: integration.calendarId,
  };
}

async function fetchGoogleCalendarJson<T>(
  workspaceId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getGoogleCalendarAccessToken(workspaceId);
  if (!token) {
    throw new Error("Google Calendar is not connected");
  }

  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listWorkspaceCalendarEventsForRange(
  workspaceId: string,
  start: Date,
  end: Date
): Promise<Array<{ id: string; title: string; start: string; end: string }>> {
  const status = await getWorkspaceCalendarStatus(workspaceId);
  if (!status.connected) {
    return [];
  }

  const integration = await getGoogleCalendarIntegration(workspaceId);
  const calendarId = integration?.calendarId || "primary";
  const query = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const data = await fetchGoogleCalendarJson<{ items?: Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> }>(
    workspaceId,
    `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`
  );

  return (data.items || [])
    .map((item) => ({
      id: item.id || "",
      title: item.summary || "Busy",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
    }))
    .filter((item) => item.id && item.start);
}

export async function syncGoogleCalendarEventForDeal(dealId: string) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      contact: true,
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!deal || !deal.scheduledAt) {
    return { success: true, skipped: true };
  }

  const status = await getWorkspaceCalendarStatus(deal.workspaceId);
  if (!status.connected) {
    return { success: true, skipped: true };
  }

  const integration = await getGoogleCalendarIntegration(deal.workspaceId);
  const calendarId = integration?.calendarId || "primary";
  const metadata = (deal.metadata as Record<string, unknown>) ?? {};
  const existingEventId = typeof metadata.googleCalendarEventId === "string" ? metadata.googleCalendarEventId : null;
  const start = new Date(deal.scheduledAt);
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);

  const payload = {
    summary: deal.title,
    description: [
      `Customer: ${deal.contact.name}`,
      deal.contact.phone ? `Phone: ${deal.contact.phone}` : null,
      deal.contact.email ? `Email: ${deal.contact.email}` : null,
      deal.address ? `Address: ${deal.address}` : null,
      `Managed in Earlymark`,
    ].filter(Boolean).join("\n"),
    location: deal.address || deal.contact.address || undefined,
    start: {
      dateTime: start.toISOString(),
    },
    end: {
      dateTime: end.toISOString(),
    },
  };

  const method = existingEventId ? "PATCH" : "POST";
  const path = existingEventId
    ? `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`
    : `/calendars/${encodeURIComponent(calendarId)}/events`;

  const data = await fetchGoogleCalendarJson<{ id?: string }>(deal.workspaceId, path, {
    method,
    body: JSON.stringify(payload),
  });

  const eventId = data.id || existingEventId;
  if (eventId && eventId !== existingEventId) {
    await db.deal.update({
      where: { id: dealId },
      data: {
        metadata: {
          ...metadata,
          googleCalendarEventId: eventId,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await db.workspaceCalendarIntegration.updateMany({
    where: {
      workspaceId: deal.workspaceId,
      provider: GOOGLE_PROVIDER,
    },
    data: {
      lastSyncAt: new Date(),
    },
  });

  return { success: true, eventId };
}

export async function removeGoogleCalendarEventForDeal(dealId: string) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      workspaceId: true,
      metadata: true,
    },
  });

  if (!deal) {
    return { success: true, skipped: true };
  }

  const status = await getWorkspaceCalendarStatus(deal.workspaceId);
  if (!status.connected) {
    return { success: true, skipped: true };
  }

  const integration = await getGoogleCalendarIntegration(deal.workspaceId);
  const calendarId = integration?.calendarId || "primary";
  const metadata = (deal.metadata as Record<string, unknown>) ?? {};
  const eventId = typeof metadata.googleCalendarEventId === "string" ? metadata.googleCalendarEventId : null;

  if (!eventId) {
    return { success: true, skipped: true };
  }

  const token = await getGoogleCalendarAccessToken(deal.workspaceId);
  if (!token) {
    return { success: true, skipped: true };
  }

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await db.deal.update({
    where: { id: dealId },
    data: {
      metadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "googleCalendarEventId")) as Prisma.InputJsonValue,
    },
  });

  return { success: true };
}

export function buildGoogleCalendarAuthUrl(workspaceId: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: getGoogleCalendarRedirectUri(),
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state: workspaceId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
