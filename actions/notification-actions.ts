"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendPushToUser } from "@/lib/push-notifications";
import { runIdempotent } from "@/lib/idempotency";
import { dispatchWhatsAppForNotification } from "@/lib/notifications/whatsapp-dispatch";

export interface NotificationView {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  actionType: string | null;
  actionPayload: Record<string, unknown> | null;
  createdAt: Date;
}

interface NotificationRecordExtras {
  actionType?: string | null;
  actionPayload?: Record<string, unknown> | null;
}

type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

function normalizeNotificationType(type?: string): NotificationSeverity {
  const normalized = (type ?? "INFO").toUpperCase();
  if (normalized === "AI" || normalized === "SYSTEM") return "INFO";
  if (normalized === "SUCCESS" || normalized === "WARNING" || normalized === "ERROR") {
    return normalized;
  }
  return "INFO";
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${k}:${stableStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
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

  return notifications.map((n) => {
    const extra = n as typeof n & NotificationRecordExtras;
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      link: n.link,
      actionType: extra.actionType ?? null,
      actionPayload: extra.actionPayload ?? null,
      createdAt: n.createdAt,
    };
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  revalidatePath("/crm", "layout");
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
  revalidatePath("/crm", "layout");
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
  type?: string;
  link?: string;
  actionType?: string;
  actionPayload?: Record<string, unknown>;
  notificationType?: string;
}) {
  const normalizedType = normalizeNotificationType(data.type);

  if (data.notificationType === "stale_deal") {
    const user = await db.user.findUnique({ where: { id: data.userId }, select: { workspaceId: true } });
    if (user?.workspaceId) {
      const ws = await db.workspace.findUnique({ where: { id: user.workspaceId }, select: { settings: true } });
      const prefs = { ...DEFAULT_PREFS, ...((ws?.settings as Record<string, unknown>)?.notificationPreferences ?? {}) } as NotificationPreferences;
      if (!prefs.inAppStaleDealAlerts) return { success: true };
    }
  }

  const bucketAt = new Date();
  const res = await runIdempotent<{ notificationId: string }>({
    actionType: "NOTIFICATION_CREATE",
    bucketAt,
    parts: [
      data.userId,
      data.title.trim().toLowerCase(),
      data.message,
      normalizedType,
      data.link ?? "",
      data.actionType ?? "",
      stableStringify(data.actionPayload),
    ],
    resultFactory: async () => {
      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: { workspaceId: true },
      });
      const workspace = user
        ? await db.workspace.findUnique({
            where: { id: user.workspaceId },
            select: { settings: true },
          })
        : null;
      const prefs = ((workspace?.settings as Record<string, unknown> | null)?.notificationPreferences ??
        {}) as Partial<NotificationPreferences>;

      const notification = await db.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: normalizedType,
          link: data.link,
          ...(data.actionType ? { actionType: data.actionType } : {}),
          ...(data.actionPayload
            ? { actionPayload: data.actionPayload as Prisma.InputJsonValue }
            : {}),
        },
      });

      if (prefs.webPushEnabled) {
        await sendPushToUser(data.userId, {
          title: data.title,
          body: data.message,
          url: data.link ?? "/crm/dashboard",
        }).catch(() => {});
      }

      await dispatchWhatsAppForNotification({
        notification,
        userId: data.userId,
        notificationType: data.notificationType,
      });

      return { notificationId: notification.id };
    },
  });

  if (!res.result?.notificationId) {
    // If idempotency still hasn't materialised a result (rare), keep behaviour safe.
    return { success: true };
  }

  return { success: true };
}

/** Notification preference keys stored in workspace.settings JSON */
export interface NotificationPreferences {
  emailDealUpdates: boolean
  emailNewContacts: boolean
  emailWeeklySummary: boolean
  inAppTaskReminders: boolean
  inAppStaleDealAlerts: boolean
  webPushEnabled: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  emailDealUpdates: true,
  emailNewContacts: true,
  emailWeeklySummary: true,
  inAppTaskReminders: true,
  inAppStaleDealAlerts: true,
  webPushEnabled: false,
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
 * Returns true if the workspace has the given email notification pref enabled.
 * Uses workspaceId directly so non-auth server code (webhooks, crons) can call it.
 */
export async function shouldSendNotificationEmail(
  workspaceId: string,
  key: keyof Pick<NotificationPreferences, "emailDealUpdates" | "emailNewContacts" | "emailWeeklySummary">
): Promise<boolean> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  })
  const settings = (workspace?.settings as Record<string, unknown>) ?? {}
  const prefs = (settings.notificationPreferences as Partial<NotificationPreferences>) ?? {}
  return prefs[key] ?? DEFAULT_PREFS[key]
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
      settings: { ...currentSettings, notificationPreferences: prefs } as unknown as Prisma.InputJsonValue,
    },
  })

  revalidatePath("/crm/settings/notifications")
  return { success: true }
}

/**
 * Create a test in-app notification for the current authenticated user.
 */
export async function sendTestNotification() {
  const authUser = await getAuthUser()
  if (!authUser?.email) throw new Error("Unauthorized")

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { id: true },
  })
  if (!user) throw new Error("Unauthorized")

  await createNotification({
    userId: user.id,
    title: "Test notification",
    message: "Notifications are working. This is a test alert from Settings.",
    type: "INFO",
    link: "/crm/settings/notifications",
  })

  revalidatePath("/crm", "layout")
  revalidatePath("/crm/settings/notifications")
  return { success: true }
}

/**
 * Automatically triggers the Morning Agenda and Evening Wrap-Up notifications
 * if the current time has passed the configured user preferences and they haven't fired today.
 */
export async function ensureDailyNotifications(workspaceId: string) {
  const user = await getAuthUser();
  if (!user) return;

  const dbUser = await db.user.findFirst({ where: { email: user.email ?? "", workspaceId } });
  if (!dbUser) return;

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return;

  const settings = (workspace.settings as Record<string, unknown>) ?? {};
  const prefs = (settings.notificationPreferences as Partial<NotificationPreferences>) ?? {};
  const notificationsEnabled = (prefs.inAppTaskReminders ?? true) === true;
  if (!notificationsEnabled) return;

  const now = new Date();
  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { agendaNotifyTime, wrapupNotifyTime } = workspace;
  if (!agendaNotifyTime && !wrapupNotifyTime) return;

  const agendaMinutes = agendaNotifyTime ? getMinutes(agendaNotifyTime) : null;
  const wrapupMinutes = wrapupNotifyTime ? getMinutes(wrapupNotifyTime) : null;

  // Time windows so "morning" and "evening" alerts don't both appear late at night
  const AGENDA_WINDOW_MIN = 3 * 60;  // 3 hours after agenda time
  const WRAPUP_WINDOW_MIN = 4 * 60;  // 4 hours after wrap-up time

  // Helper date bounding for "today"
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (
    agendaMinutes !== null &&
    currentMinutes >= agendaMinutes &&
    currentMinutes <= agendaMinutes + AGENDA_WINDOW_MIN
  ) {
    const existing = await db.notification.findFirst({
      where: { userId: dbUser.id, title: { contains: "Morning Briefing" }, createdAt: { gte: startOfDay } }
    });
    if (!existing) {
      // Fetch today's scheduled jobs for the run-sheet summary
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);
      const todayJobs = await db.deal.findMany({
        where: {
          workspaceId,
          stage: "scheduled",
          scheduledAt: { gte: todayStart, lt: todayEnd },
        },
        select: { title: true, scheduledAt: true, value: true, contact: { select: { name: true } } },
        orderBy: { scheduledAt: "asc" },
      });

      let runSheetLines = "";
      if (todayJobs.length > 0) {
        const total = todayJobs.reduce((s, j) => s + (Number(j.value) || 0), 0);
        const lines = todayJobs.map((j) => {
          const t = j.scheduledAt
            ? new Date(j.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
            : "TBC";
          return `• ${t} — ${j.title}${j.contact?.name ? ` (${j.contact.name})` : ""} · $${Number(j.value || 0).toFixed(0)}`;
        });
        runSheetLines = `\n\n${lines.join("\n")}\n\nExpected today: $${total.toFixed(0)}`;
      } else {
        runSheetLines = "\n\nNo jobs scheduled yet — check the pipeline for quotes to chase.";
      }

      const morningMessage = `Good morning! Here${todayJobs.length > 0 ? ` are your ${todayJobs.length} job${todayJobs.length > 1 ? "s" : ""} today` : "'s your morning briefing"}:${runSheetLines}`;
      await createNotification({
        userId: dbUser.id,
        title: "☀️ Morning Briefing",
        message: `${todayJobs.length > 0 ? `${todayJobs.length} job${todayJobs.length > 1 ? "s" : ""} today` : "No jobs today"} — tap to see your run sheet.`,
        type: "INFO",
        link: "/crm/run-sheet",
        actionType: "CONFIRM_JOB",
        actionPayload: { trigger: "morning_briefing" },
      });
      await db.chatMessage.create({
        data: { role: "assistant", content: `☀️ Morning Briefing\n${morningMessage}`, workspaceId },
      });
    }
  }

  if (
    wrapupMinutes !== null &&
    currentMinutes >= wrapupMinutes &&
    currentMinutes <= wrapupMinutes + WRAPUP_WINDOW_MIN
  ) {
    const existing = await db.notification.findFirst({
      where: { userId: dbUser.id, title: { contains: "Evening Wrap-Up" }, createdAt: { gte: startOfDay } }
    });
    if (!existing) {
      // Check for any unresolved deviations today
      const todayDeviations = await db.deviationEvent.count({
        where: {
          workspaceId,
          resolved: false,
          createdAt: { gte: startOfDay }
        }
      });

      let message = "Your day is wrapping up. Check tonight's wrap for jobs done, outstanding invoices, and quotes to chase.";
      let link = "/crm/wrap-up";

      if (todayDeviations > 0) {
        message += ` Also: I noticed you accepted ${todayDeviations} job(s) today that deviate from your core rules — review them when you get a chance.`;
      }

      await createNotification({
        userId: dbUser.id,
        title: "🌙 Evening Wrap-Up",
        message,
        type: "SUCCESS",
        link
      });
      await db.chatMessage.create({
        data: {
          role: "assistant",
          content: `🌙 Evening Wrap-Up: ${message}`,
          workspaceId,
        },
      });
    }
  }

  // ── Follow-up chase reminders (stale quotes + unpaid invoices) ──────────────
  await ensureFollowUpReminders(workspaceId, dbUser.id, settings, startOfDay);
}

/**
 * Creates a daily Tracey chat message when there are stale quotes or unpaid invoices
 * that have exceeded the workspace-configured cadence (softChase / invoiceFollowUp).
 */
async function ensureFollowUpReminders(
  workspaceId: string,
  userId: string,
  settings: Record<string, unknown>,
  startOfDay: Date,
) {
  const softChase = (settings.softChase as { triggerDays?: number } | undefined) ?? {};
  const invoiceFollowUp = (settings.invoiceFollowUp as { triggerDays?: number } | undefined) ?? {};
  const quoteStaleDays = softChase.triggerDays ?? 3;
  const invoiceStaleDays = invoiceFollowUp.triggerDays ?? 7;

  // Idempotency: only fire once per day
  const existingChase = await db.notification.findFirst({
    where: { userId, title: { contains: "Follow-Up Reminders" }, createdAt: { gte: startOfDay } },
  });
  if (existingChase) return;

  const quoteThreshold = new Date(Date.now() - quoteStaleDays * 86_400_000);
  const invoiceThreshold = new Date(Date.now() - invoiceStaleDays * 86_400_000);

  const [staleQuotes, unpaidInvoices] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId, stage: "quote_sent", stageChangedAt: { lte: quoteThreshold } },
      select: { id: true, title: true, contact: { select: { name: true } }, value: true },
      take: 5,
    }),
    db.invoice.findMany({
      where: { deal: { workspaceId }, status: "ISSUED", issuedAt: { lte: invoiceThreshold } },
      select: { number: true, total: true, deal: { select: { contact: { select: { name: true } } } } },
      take: 5,
    }),
  ]);

  if (staleQuotes.length === 0 && unpaidInvoices.length === 0) return;

  const lines: string[] = [];
  if (staleQuotes.length > 0) {
    lines.push(`**Quotes with no reply (${quoteStaleDays}+ days):**`);
    staleQuotes.forEach((q) =>
      lines.push(`• ${q.title}${q.contact?.name ? ` — ${q.contact.name}` : ""} · $${Number(q.value || 0).toFixed(0)}`)
    );
  }
  if (unpaidInvoices.length > 0) {
    if (lines.length) lines.push("");
    lines.push(`**Unpaid invoices (${invoiceStaleDays}+ days):**`);
    unpaidInvoices.forEach((inv) =>
      lines.push(`• Invoice #${inv.number}${inv.deal?.contact?.name ? ` — ${inv.deal.contact.name}` : ""} · $${Number(inv.total || 0).toFixed(0)}`)
    );
  }
  lines.push("\nWant me to chase any of these? Just say the word.");

  const content = `📋 Follow-Up Reminders\n\n${lines.join("\n")}`;

  await Promise.all([
    createNotification({
      userId,
      title: "📋 Follow-Up Reminders",
      message: `${staleQuotes.length + unpaidInvoices.length} item${staleQuotes.length + unpaidInvoices.length > 1 ? "s" : ""} need chasing — tap to see details.`,
      type: "WARNING",
      link: "/crm/dashboard",
    }),
    db.chatMessage.create({ data: { role: "assistant", content, workspaceId } }),
  ]);
}
