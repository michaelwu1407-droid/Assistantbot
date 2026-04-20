import type { Notification } from "@prisma/client";

type ActionPayload = Record<string, string | undefined>;

function actionCode(notification: Notification): string {
  const suffix = notification.id.slice(-10);
  const code = `N-${suffix}`;
  if (!notification.actionType) return `Reply: OK ${code}`;

  const actionMap: Record<string, string> = {
    CONFIRM_JOB: `Reply: ACCEPT ${code} / REJECT ${code}`,
    APPROVE_COMPLETION: `Reply: ACCEPT ${code} / REJECT ${code}`,
    CALL_CLIENT: `Reply: OK ${code}`,
    SEND_INVOICE: `Reply: OK ${code}`,
  };

  return actionMap[notification.actionType] ?? `Reply: OK ${code}`;
}

function formatNewLead(n: Notification): string {
  const payload = (n.actionPayload ?? {}) as ActionPayload;
  const name = payload.contactName ?? "New lead";
  const service = payload.service ?? "";
  const source = payload.source ?? "";
  const phone = payload.phone ?? "";

  const lines = [`📋 *New lead: ${name}*`];
  if (service) lines.push(`Service: ${service}`);
  if (source) lines.push(`Via: ${source}`);
  if (phone) lines.push(`Phone: ${phone}`);
  lines.push("");
  lines.push(actionCode(n));
  return lines.join("\n");
}

function formatAiCallCompleted(n: Notification): string {
  const payload = (n.actionPayload ?? {}) as ActionPayload;
  const contact = payload.contactName ?? "a customer";
  const outcome = payload.outcome ?? n.message;

  return `📞 *AI call with ${contact} completed*\n\n${outcome}\n\n${actionCode(n)}`;
}

function formatBookingConfirmed(n: Notification): string {
  const payload = (n.actionPayload ?? {}) as ActionPayload;
  const title = payload.dealTitle ?? n.title;
  const when = payload.scheduledAt ?? "";

  const lines = [`✅ *Booking confirmed: ${title}*`];
  if (when) lines.push(`Date: ${when}`);
  lines.push("");
  lines.push(actionCode(n));
  return lines.join("\n");
}

function formatStaleDeal(n: Notification): string {
  const payload = (n.actionPayload ?? {}) as ActionPayload;
  const title = payload.dealTitle ?? n.title;
  const days = payload.idleDays ? `${payload.idleDays}d idle` : "";

  const header = days ? `⚠️ *Stale deal: ${title}* (${days})` : `⚠️ *Stale deal: ${title}*`;
  return `${header}\n\nThis deal needs your attention.\n\n${actionCode(n)}`;
}

function formatMorningBriefing(n: Notification): string {
  return `☀️ *Morning briefing*\n\n${n.message}`;
}

function formatPaymentReceived(n: Notification): string {
  const payload = (n.actionPayload ?? {}) as ActionPayload;
  const amount = payload.amount ?? "";
  const title = payload.dealTitle ?? n.title;

  const header = amount ? `💰 *Paid: ${amount} — ${title}*` : `💰 *Payment received: ${title}*`;
  return `${header}\n\n${actionCode(n)}`;
}

function formatDefault(n: Notification): string {
  return `${n.title}\n\n${n.message}\n\n${actionCode(n)}`;
}

const FORMATTERS: Record<string, (n: Notification) => string> = {
  new_lead: formatNewLead,
  ai_call_completed: formatAiCallCompleted,
  booking_confirmed: formatBookingConfirmed,
  stale_deal: formatStaleDeal,
  morning_briefing: formatMorningBriefing,
  payment_received: formatPaymentReceived,
};

export function formatWhatsAppNotification(notification: Notification, notificationType: string): string {
  const formatter = FORMATTERS[notificationType] ?? formatDefault;
  return formatter(notification);
}
