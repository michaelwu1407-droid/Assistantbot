"use server";

import { db } from "@/lib/db";
import { buildXeroAuthUrl, getXeroOAuthRedirectUri } from "@/lib/xero";
import { buildGoogleCalendarAuthUrl, disconnectGoogleCalendarIntegration, getWorkspaceCalendarStatus } from "@/lib/workspace-calendar";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

type IntegrationReadiness = {
  gmail: { ready: boolean; reason?: string };
  outlook: { ready: boolean; reason?: string };
  googleCalendar: { ready: boolean; reason?: string };
  xero: { ready: boolean; reason?: string };
};

function hasBaseAppUrl() {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());
}

function configuredOrReason(
  configured: boolean,
  reason: string
): { ready: boolean; reason?: string } {
  return configured ? { ready: true } : { ready: false, reason };
}

export async function getIntegrationConnectionReadiness(): Promise<IntegrationReadiness> {
  const hasAppUrl = hasBaseAppUrl();

  return {
    gmail: configuredOrReason(
      Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && hasAppUrl),
      "Gmail OAuth is not configured yet.",
    ),
    outlook: configuredOrReason(
      Boolean(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET && hasAppUrl),
      "Outlook OAuth is not configured yet.",
    ),
    googleCalendar: configuredOrReason(
      Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && hasAppUrl),
      "Google Calendar is not configured yet.",
    ),
    xero: configuredOrReason(
      Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET && hasAppUrl && getXeroOAuthRedirectUri()),
      "Xero OAuth is not configured yet.",
    ),
  };
}

/**
 * Initiates the Xero OAuth 2.0 flow by returning the authorization URL.
 */
export async function connectXero(): Promise<{ url: string | null }> {
  try {
    const readiness = await getIntegrationConnectionReadiness();
    if (!readiness.xero.ready) return { url: null };
    const actor = await requireCurrentWorkspaceAccess().catch(() => null);
    if (!actor?.workspaceId) return { url: null };

    const url = buildXeroAuthUrl(actor.workspaceId);
    return { url };
  } catch (error) {
    console.error("[connectXero] Error:", error);
    return { url: null };
  }
}

export async function getIntegrationStatus() {
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);
  if (!actor?.workspaceId) {
    return {
      emailIntegrations: [],
      xeroConnected: false,
      calendarIntegration: { connected: false, provider: "google", emailAddress: null, lastSyncAt: null, calendarId: null },
    };
  }

  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: {
      workspaceId: true,
      emailIntegrations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          emailAddress: true,
          isActive: true,
          lastSyncAt: true,
        },
      },
      workspace: {
        select: { settings: true },
      },
    },
  });

  const settings = (user?.workspace.settings as Record<string, unknown> | undefined) ?? {};
  const workspaceId = user?.workspaceId ?? actor.workspaceId;
  const calendarIntegration = workspaceId
    ? await getWorkspaceCalendarStatus(workspaceId)
    : { connected: false, provider: "google", emailAddress: null, lastSyncAt: null, calendarId: null };

  return {
    emailIntegrations: user?.emailIntegrations ?? [],
    xeroConnected: Boolean(settings.xero_access_token && settings.xero_tenant_id),
    calendarIntegration,
  };
}

export async function connectGoogleCalendar(): Promise<{ url: string | null }> {
  const readiness = await getIntegrationConnectionReadiness();
  if (!readiness.googleCalendar.ready) return { url: null };
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);

  if (!actor?.workspaceId) {
    return { url: null };
  }

  return { url: buildGoogleCalendarAuthUrl(actor.workspaceId) };
}

export async function disconnectWorkspaceCalendarIntegration() {
  const actor = await requireCurrentWorkspaceAccess();

  if (!actor.workspaceId) {
    throw new Error("Workspace not found");
  }

  await disconnectGoogleCalendarIntegration(actor.workspaceId);
  return { success: true };
}

export async function disconnectEmailIntegration(integrationId: string) {
  const actor = await requireCurrentWorkspaceAccess();

  await db.emailIntegration.deleteMany({
    where: {
      id: integrationId,
      userId: actor.id,
    },
  });

  return { success: true };
}
