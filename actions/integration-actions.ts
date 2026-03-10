"use server";

import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildXeroAuthUrl } from "@/lib/xero";
import { buildGoogleCalendarAuthUrl, disconnectGoogleCalendarIntegration, getWorkspaceCalendarStatus } from "@/lib/workspace-calendar";

/**
 * Initiates the Xero OAuth 2.0 flow by returning the authorization URL.
 */
export async function connectXero(): Promise<{ url: string | null }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { url: null };
    const workspace = await db.workspace.findFirst({
      where: {
        users: {
          some: { id: userId }
        }
      }
    });

    if (!workspace) return { url: null };

    const url = buildXeroAuthUrl(workspace.id);
    return { url };
  } catch (error) {
    console.error("[connectXero] Error:", error);
    return { url: null };
  }
}

export async function getIntegrationStatus() {
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      emailIntegrations: [],
      xeroConnected: false,
      calendarIntegration: { connected: false, provider: "google", emailAddress: null, lastSyncAt: null, calendarId: null },
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
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
  const calendarIntegration = user?.workspaceId
    ? await getWorkspaceCalendarStatus(user.workspaceId)
    : { connected: false, provider: "google", emailAddress: null, lastSyncAt: null, calendarId: null };

  return {
    emailIntegrations: user?.emailIntegrations ?? [],
    xeroConnected: Boolean(settings.xero_access_token && settings.xero_tenant_id),
    calendarIntegration,
  };
}

export async function connectGoogleCalendar(): Promise<{ url: string | null }> {
  const userId = await getAuthUserId();
  if (!userId) return { url: null };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) {
    return { url: null };
  }

  return { url: buildGoogleCalendarAuthUrl(user.workspaceId) };
}

export async function disconnectWorkspaceCalendarIntegration() {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) {
    throw new Error("Workspace not found");
  }

  await disconnectGoogleCalendarIntegration(user.workspaceId);
  return { success: true };
}

export async function disconnectEmailIntegration(integrationId: string) {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");

  await db.emailIntegration.deleteMany({
    where: {
      id: integrationId,
      userId,
    },
  });

  return { success: true };
}
