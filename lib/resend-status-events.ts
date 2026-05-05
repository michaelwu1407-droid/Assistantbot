import { db } from "@/lib/db";

const TRACKABLE_RESEND_EVENTS = [
  "email.delivered",
  "email.opened",
  "email.bounced",
  "email.complained",
] as const;

type TrackableResendEventType = (typeof TRACKABLE_RESEND_EVENTS)[number];

type ResendEventPayload = {
  type?: string;
  data?: Record<string, unknown>;
};

function extractRecipientEmail(data: Record<string, unknown>) {
  const to = data.to;
  if (Array.isArray(to)) {
    return typeof to[0] === "string" ? to[0] : "";
  }
  if (typeof to === "string") return to;
  if (typeof data.email === "string") return data.email;
  return "";
}

export function isTrackableResendEvent(eventType: string): eventType is TrackableResendEventType {
  return TRACKABLE_RESEND_EVENTS.includes(eventType as TrackableResendEventType);
}

export async function processResendStatusEvent(payload: ResendEventPayload) {
  const eventType = String(payload.type ?? "");
  const data = (payload.data ?? {}) as Record<string, unknown>;

  if (!isTrackableResendEvent(eventType)) {
    return { handled: false as const, eventType };
  }

  const recipientEmail = extractRecipientEmail(data);
  if (!recipientEmail) {
    return { handled: true as const, eventType, statusLabel: eventType, contactId: null };
  }

  const statusMap: Record<TrackableResendEventType, string> = {
    "email.delivered": "Delivered",
    "email.opened": "Opened",
    "email.bounced": "Bounced",
    "email.complained": "Spam Report",
  };

  const statusLabel = statusMap[eventType];

  const contact = await db.contact.findFirst({
    where: { email: { equals: recipientEmail, mode: "insensitive" } },
    select: { id: true, name: true, workspaceId: true },
  });

  if (contact) {
    const recentActivity = await db.activity.findFirst({
      where: {
        contactId: contact.id,
        type: "EMAIL",
        title: { startsWith: "Email to" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentActivity) {
      const timestamp = new Date().toLocaleString("en-AU", {
        timeZone: "Australia/Sydney",
      });

      await db.activity.update({
        where: { id: recentActivity.id },
        data: {
          description: `${statusLabel} at ${timestamp}`,
        },
      });
    }

    if (eventType === "email.opened") {
      const workspace = await db.workspace.findUnique({
        where: { id: contact.workspaceId },
        select: { ownerId: true },
      });

      if (workspace?.ownerId) {
        await db.notification.create({
          data: {
            userId: workspace.ownerId,
            title: "Email Read Receipt",
            message: `${contact.name} opened your email`,
            type: "INFO",
            link: "/crm/dashboard",
          },
        });
      }
    }
  }

  await db.webhookEvent.create({
    data: {
      provider: "resend",
      eventType,
      status: "success",
      payload: JSON.parse(
        JSON.stringify({
          to: recipientEmail,
          contactId: contact?.id,
          emailId: data.email_id ?? data.id,
        }),
      ),
    },
  }).catch(() => {});

  return {
    handled: true as const,
    eventType,
    statusLabel,
    contactId: contact?.id ?? null,
  };
}
