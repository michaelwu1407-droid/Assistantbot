"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { NOTIFICATION_TYPE_CATALOG, type NotificationType } from "@/lib/notifications/notification-type-catalog";

async function getCurrentUser() {
  const authUser = await getAuthUser();
  if (!authUser?.email) throw new Error("Unauthorized");
  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { id: true, phone: true },
  });
  if (!user) throw new Error("User not found");
  return user;
}

export async function getWhatsAppContext(): Promise<{
  phone: string | null;
  toggles: Record<string, boolean>;
  catalog: NotificationType[];
}> {
  const user = await getCurrentUser();

  const prefs = await db.notificationChannelPref.findMany({
    where: { userId: user.id, channel: "whatsapp" },
    select: { notificationType: true, enabled: true },
  });

  const toggles = Object.fromEntries(
    NOTIFICATION_TYPE_CATALOG.map((t) => [t.key, false]),
  );
  for (const pref of prefs) {
    toggles[pref.notificationType] = pref.enabled;
  }

  return { phone: user.phone ?? null, toggles, catalog: NOTIFICATION_TYPE_CATALOG };
}

export async function setWhatsAppPref(
  notificationType: string,
  enabled: boolean,
): Promise<{ success: true }> {
  const user = await getCurrentUser();

  if (!NOTIFICATION_TYPE_CATALOG.some((t) => t.key === notificationType)) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }

  await db.notificationChannelPref.upsert({
    where: {
      userId_notificationType_channel: {
        userId: user.id,
        notificationType,
        channel: "whatsapp",
      },
    },
    update: { enabled },
    create: {
      userId: user.id,
      notificationType,
      channel: "whatsapp",
      enabled,
    },
  });

  return { success: true };
}
