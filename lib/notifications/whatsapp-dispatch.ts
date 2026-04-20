import type { Notification } from "@prisma/client";
import { db } from "@/lib/db";
import { sendWhatsApp } from "@/lib/twilio/whatsapp";
import { formatWhatsAppNotification } from "@/lib/notifications/whatsapp-formatters";

export async function dispatchWhatsAppForNotification({
  notification,
  userId,
  notificationType,
}: {
  notification: Notification;
  userId: string;
  notificationType?: string;
}): Promise<void> {
  // No-op when feature flag is off or no type provided
  if (!notificationType) return;
  if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED !== "true") return;

  try {
    const pref = await db.notificationChannelPref.findUnique({
      where: {
        userId_notificationType_channel: {
          userId,
          notificationType,
          channel: "whatsapp",
        },
      },
    });

    if (!pref?.enabled) {
      await logEvent(userId, notification.id, notificationType, "skipped_disabled");
      return;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      await logEvent(userId, notification.id, notificationType, "skipped_no_phone");
      return;
    }

    const body = formatWhatsAppNotification(notification, notificationType);
    const msg = await sendWhatsApp(user.phone, body);

    await logEvent(userId, notification.id, notificationType, "success", { sid: msg?.sid });
  } catch (err) {
    console.error("[WhatsApp dispatch] Error:", err);
    await logEvent(userId, notification.id, notificationType, "error", {
      error: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
  }
}

async function logEvent(
  userId: string,
  notificationId: string,
  notificationType: string,
  status: string,
  extra?: Record<string, unknown>,
) {
  await db.webhookEvent
    .create({
      data: {
        provider: "twilio",
        eventType: "whatsapp.outbound.notification",
        status,
        payload: { userId, notificationId, notificationType, ...extra },
      },
    })
    .catch(() => {});
}
