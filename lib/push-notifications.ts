import webpush from "web-push";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging";

type SubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function ensureConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@earlymark.ai";
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return ensureConfigured() !== null;
}

export async function savePushSubscription(
  userId: string,
  subscription: SubscriptionPayload,
  userAgent?: string,
): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent ?? null,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent ?? null,
    },
  });
}

export async function removePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!isPushConfigured()) return;
  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/crm/dashboard",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        );
      } catch (error) {
        logger.warn("Push notification send failed", {
          component: "push-notifications",
          action: "sendPushToUser",
          userId,
          endpoint: sub.endpoint,
          error: error instanceof Error ? error.message : String(error),
        });
        // endpoint expired/invalid -> cleanup
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }),
  );
}
