"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface NotificationView {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  read: boolean;
  link: string | null;
  createdAt: Date;
}

/**
 * Get unread notifications for a user.
 */
export async function getNotifications(userId: string): Promise<NotificationView[]> {
  const notifications = await db.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt,
  }));
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Create a notification (Internal use).
 * Triggers: (1) Tradie job status changes (e.g. Traveling, On site), (2) Automations
 * when a rule runs the "Create Notification" action (e.g. deal goes stale, stage change).
 */
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  link?: string;
}) {
  await db.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      link: data.link,
    },
  });
  return { success: true };
}

/** Notification preference keys stored in workspace.settings JSON */
export interface NotificationPreferences {
  emailDealUpdates: boolean
  emailNewContacts: boolean
  emailWeeklySummary: boolean
  inAppTaskReminders: boolean
  inAppStaleDealAlerts: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  emailDealUpdates: true,
  emailNewContacts: true,
  emailWeeklySummary: true,
  inAppTaskReminders: true,
  inAppStaleDealAlerts: true,
}

/**
 * Get notification preferences from workspace settings JSON.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const authUser = await getAuthUser()
  if (!authUser?.email) return DEFAULT_PREFS
  const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
  if (!user) return DEFAULT_PREFS

  const workspace = await db.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { settings: true },
  })

  const settings = (workspace?.settings as Record<string, unknown>) ?? {}
  const prefs = (settings.notificationPreferences as Partial<NotificationPreferences>) ?? {}
  return { ...DEFAULT_PREFS, ...prefs }
}

/**
 * Save notification preferences to workspace settings JSON.
 */
export async function saveNotificationPreferences(prefs: NotificationPreferences) {
  const authUser = await getAuthUser()
  if (!authUser?.email) throw new Error("Unauthorized")
  const user = await db.user.findFirst({ where: { email: authUser.email }, select: { workspaceId: true } })
  if (!user) throw new Error("Unauthorized")

  const workspace = await db.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { settings: true },
  })

  const currentSettings = (workspace?.settings as Record<string, unknown>) ?? {}
  await db.workspace.update({
    where: { id: user.workspaceId },
    data: {
      settings: { ...currentSettings, notificationPreferences: { ...prefs } } as Record<string, unknown>,
    },
  })

  revalidatePath("/dashboard/settings/notifications")
  return { success: true }
}

/**
 * Automatically triggers the Morning Agenda and Evening Wrap-Up notifications
 * if the current time has passed the configured user preferences and they haven't fired today.
 */
export async function ensureDailyNotifications(workspaceId: string) {
  const { getAuthUser } = await import("@/lib/auth");
  let user;
  try {
    user = await getAuthUser();
  } catch { return; }

  const dbUser = await db.user.findFirst({ where: { email: user.email ?? "", workspaceId } });
  if (!dbUser) return;

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return;

  const { agendaNotifyTime, wrapupNotifyTime } = workspace;
  if (!agendaNotifyTime && !wrapupNotifyTime) return;

  const now = new Date();
  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper date bounding for "today"
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (agendaNotifyTime && currentMinutes >= getMinutes(agendaNotifyTime)) {
    const existing = await db.notification.findFirst({
      where: { userId: dbUser.id, title: { contains: "Morning Agenda" }, createdAt: { gte: startOfDay } }
    });
    if (!existing) {
      await createNotification({
        userId: dbUser.id,
        title: "☀️ Morning Agenda",
        message: "Good morning! Your daily AI schedule optimization has run. Click to view your dashboard.",
        type: "INFO",
        link: "/dashboard"
      });
    }
  }

  if (wrapupNotifyTime && currentMinutes >= getMinutes(wrapupNotifyTime)) {
    const existing = await db.notification.findFirst({
      where: { userId: dbUser.id, title: { contains: "Evening Wrap-Up" }, createdAt: { gte: startOfDay } }
    });
    if (!existing) {
      await createNotification({
        userId: dbUser.id,
        title: "🌙 Evening Wrap-Up",
        message: "Your day is wrapping up. Don't forget to review draft jobs and finalize your invoices.",
        type: "SUCCESS",
        link: "/dashboard/inbox"
      });
    }
  }
}
