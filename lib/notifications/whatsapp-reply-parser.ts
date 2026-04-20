import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { executeNotificationAction, type ActionVerb } from "@/lib/notifications/action-executor";

const ACTION_CODE_RE = /^\s*(ACCEPT|REJECT|CONFIRM|SNOOZE|OK)\s+N-([a-z0-9]{6,})\b/i;

export interface ParsedActionCode {
  verb: ActionVerb;
  suffix: string;
}

export function parseActionCode(body: string): ParsedActionCode | null {
  const match = body.match(ACTION_CODE_RE);
  if (!match) return null;
  return {
    verb: match[1].toUpperCase() as ActionVerb,
    suffix: match[2],
  };
}

export async function resolveAndExecute(
  user: Pick<User, "id">,
  parsed: ParsedActionCode,
): Promise<{ handled: true; reply: string } | { handled: false }> {
  const notification = await db.notification.findFirst({
    where: {
      userId: user.id,
      id: { endsWith: parsed.suffix },
    },
  });

  if (!notification) return { handled: false };

  const result = await executeNotificationAction(notification, parsed.verb);

  await db.webhookEvent
    .create({
      data: {
        provider: "twilio",
        eventType: "whatsapp.action.executed",
        status: result.success ? "success" : "error",
        payload: {
          userId: user.id,
          notificationId: notification.id,
          verb: parsed.verb,
          actionType: notification.actionType ?? null,
          reply: result.reply,
        },
      },
    })
    .catch(() => {});

  return { handled: true, reply: result.reply };
}
