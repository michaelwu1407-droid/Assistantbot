import { db } from "@/lib/db";

export const LEAD_GUARD_PROVIDER = "lead_guard";

const PHONE_BURST_WINDOW_MS = 30 * 60 * 1000;
const EMAIL_BURST_WINDOW_MS = 30 * 60 * 1000;
const WEBFORM_IP_WINDOW_MS = 15 * 60 * 1000;
const PHONE_BURST_THRESHOLD = 3;
const EMAIL_BURST_THRESHOLD = 3;
const WEBFORM_IP_THRESHOLD = 4;

export type InboundLeadChannel = "webform" | "inbound_email" | "inbound_sms" | "missed_call";
export type InboundLeadGuardReason = "phone_burst" | "email_burst" | "webform_ip_burst";

export type InboundLeadGuardPayload = {
  workspaceId: string;
  channel: InboundLeadChannel;
  reason: InboundLeadGuardReason;
  eventCount: number;
  windowMinutes: number;
  contactId?: string | null;
  dealId?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  ipAddress?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseInboundLeadGuardPayload(value: unknown): InboundLeadGuardPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const workspaceId = readString(record, "workspaceId");
  const channel = readString(record, "channel");
  const reason = readString(record, "reason");
  const eventCount = readNumber(record, "eventCount");
  const windowMinutes = readNumber(record, "windowMinutes");

  if (
    !workspaceId
    || (channel !== "webform" && channel !== "inbound_email" && channel !== "inbound_sms" && channel !== "missed_call")
    || (reason !== "phone_burst" && reason !== "email_burst" && reason !== "webform_ip_burst")
    || eventCount == null
    || windowMinutes == null
  ) {
    return null;
  }

  return {
    workspaceId,
    channel,
    reason,
    eventCount,
    windowMinutes,
    contactId: readString(record, "contactId"),
    dealId: readString(record, "dealId"),
    contactPhone: readString(record, "contactPhone"),
    contactEmail: readString(record, "contactEmail"),
    ipAddress: readString(record, "ipAddress"),
  };
}

function channelLabel(channel: InboundLeadChannel) {
  switch (channel) {
    case "webform":
      return "website form";
    case "inbound_email":
      return "lead email";
    case "inbound_sms":
      return "SMS";
    case "missed_call":
      return "missed call";
    default:
      return "lead";
  }
}

export function formatInboundLeadGuardReason(reason: InboundLeadGuardReason) {
  switch (reason) {
    case "phone_burst":
      return "the same phone number created several leads in a short burst";
    case "email_burst":
      return "the same email address created several leads in a short burst";
    case "webform_ip_burst":
      return "one website source sent too many lead submissions too quickly";
    default:
      return "the lead looked suspicious";
  }
}

export function buildInboundLeadGuardCopy(payload: InboundLeadGuardPayload) {
  const title = "Lead held for spam review";
  const detail = `Tracey held this ${channelLabel(payload.channel)} because ${formatInboundLeadGuardReason(payload.reason)}.`;
  const specifics =
    payload.reason === "webform_ip_burst" && payload.ipAddress
      ? `Source ${payload.ipAddress} triggered ${payload.eventCount} submissions inside ${payload.windowMinutes} minutes.`
      : payload.contactPhone
        ? `${payload.contactPhone} created ${payload.eventCount} leads inside ${payload.windowMinutes} minutes.`
        : payload.contactEmail
          ? `${payload.contactEmail} created ${payload.eventCount} leads inside ${payload.windowMinutes} minutes.`
          : `${payload.eventCount} leads arrived inside ${payload.windowMinutes} minutes.`;

  return {
    title,
    description: `${detail} ${specifics}`,
  };
}

export async function recordInboundLeadGuardEvent(payload: InboundLeadGuardPayload) {
  try {
    await db.webhookEvent.create({
      data: {
        provider: LEAD_GUARD_PROVIDER,
        eventType: "lead_flagged",
        status: "success",
        payload,
      },
    });
  } catch (error) {
    console.error("[lead-guard] Failed to record inbound lead guard event:", error);
  }
}

export async function assessInboundLeadGuard(input: {
  workspaceId: string;
  channel: InboundLeadChannel;
  contactPhone?: string | null;
  contactEmail?: string | null;
  ipAddress?: string | null;
}) {
  const phone = input.contactPhone?.trim() || null;
  const email = input.contactEmail?.trim().toLowerCase() || null;
  const ipAddress = input.ipAddress?.trim() || null;

  if (phone) {
    const eventCount = await db.deal.count({
      where: {
        workspaceId: input.workspaceId,
        createdAt: { gt: new Date(Date.now() - PHONE_BURST_WINDOW_MS) },
        contact: { phone },
      },
    }).catch(() => 0);

    if (eventCount >= PHONE_BURST_THRESHOLD) {
      return {
        blocked: true,
        payload: {
          workspaceId: input.workspaceId,
          channel: input.channel,
          reason: "phone_burst" as const,
          eventCount,
          windowMinutes: Math.floor(PHONE_BURST_WINDOW_MS / 60_000),
          contactPhone: phone,
        },
      };
    }
  }

  if (email) {
    const eventCount = await db.deal.count({
      where: {
        workspaceId: input.workspaceId,
        createdAt: { gt: new Date(Date.now() - EMAIL_BURST_WINDOW_MS) },
        contact: { email: { equals: email, mode: "insensitive" } },
      },
    }).catch(() => 0);

    if (eventCount >= EMAIL_BURST_THRESHOLD) {
      return {
        blocked: true,
        payload: {
          workspaceId: input.workspaceId,
          channel: input.channel,
          reason: "email_burst" as const,
          eventCount,
          windowMinutes: Math.floor(EMAIL_BURST_WINDOW_MS / 60_000),
          contactEmail: email,
        },
      };
    }
  }

  if (input.channel === "webform" && ipAddress && ipAddress !== "unknown") {
    const eventCount = await db.webhookEvent.count({
      where: {
        provider: "webform",
        eventType: "lead_received",
        status: "success",
        createdAt: { gt: new Date(Date.now() - WEBFORM_IP_WINDOW_MS) },
        AND: [
          { payload: { path: ["workspaceId"], equals: input.workspaceId } },
          { payload: { path: ["ip"], equals: ipAddress } },
        ],
      },
    }).catch(() => 0);

    if (eventCount >= WEBFORM_IP_THRESHOLD) {
      return {
        blocked: true,
        payload: {
          workspaceId: input.workspaceId,
          channel: input.channel,
          reason: "webform_ip_burst" as const,
          eventCount,
          windowMinutes: Math.floor(WEBFORM_IP_WINDOW_MS / 60_000),
          ipAddress,
        },
      };
    }
  }

  return { blocked: false as const, payload: null };
}
