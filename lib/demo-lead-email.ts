import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";

const RESEND_EMAIL_COST_USD = 0.001;

export type DemoLeadEmailInput = {
  leadId: string | null;
  source: "homepage_form" | "contact_form" | "api";
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  businessName?: string;
  callStatus: "initiated" | "failed";
  callError?: string | null;
  roomName?: string | null;
  resolvedTrunkId?: string | null;
  callerNumber?: string | null;
  warnings?: string[] | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatName(firstName: string, lastName?: string) {
  return `${firstName} ${lastName || ""}`.trim();
}

function buildSubject(input: DemoLeadEmailInput) {
  const name = formatName(input.firstName, input.lastName);
  const business = input.businessName?.trim();
  const statusLabel = input.callStatus === "initiated" ? "callback started" : "callback failed";
  if (business) {
    return `[Demo lead] ${name} - ${business} (${statusLabel})`;
  }
  return `[Demo lead] ${name} (${statusLabel})`;
}

function buildRows(input: DemoLeadEmailInput) {
  return [
    ["Lead ID", input.leadId || "Not persisted"],
    ["Source", input.source],
    ["Name", formatName(input.firstName, input.lastName) || "Unknown"],
    ["Business", input.businessName?.trim() || "Not provided"],
    ["Phone", input.phone.trim() || "Not provided"],
    ["Email", input.email?.trim() || "Not provided"],
    ["Callback status", input.callStatus],
    ["Callback error", input.callError?.trim() || "None"],
    ["Room", input.roomName?.trim() || "Not available"],
    ["Resolved trunk", input.resolvedTrunkId?.trim() || "Not available"],
    ["Caller number", input.callerNumber?.trim() || "Not available"],
    ["Warnings", input.warnings?.length ? input.warnings.join("; ") : "None"],
  ] as const;
}

function buildText(input: DemoLeadEmailInput) {
  return buildRows(input)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function buildHtml(input: DemoLeadEmailInput) {
  const rows = buildRows(input)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #dbe1ea;font-weight:600;background:#f8fafc;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #dbe1ea;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return [
    `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">`,
    `<h2 style="margin:0 0 16px;">New Tracey demo lead</h2>`,
    `<p style="margin:0 0 16px;">A new demo lead was submitted and Tracey attempted the callback.</p>`,
    `<table style="border-collapse:collapse;width:100%;max-width:720px;">${rows}</table>`,
    `</div>`,
  ].join("");
}

export async function sendDemoLeadNotificationEmail(input: DemoLeadEmailInput) {
  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (!resendKey) {
    return { sent: false, skipped: true, reason: "RESEND_API_KEY missing" } as const;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai";
  const to = assertSafeRecipient("email", process.env.SALES_EMAIL_TO || "sales@earlymark.ai");

  await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
    resend.emails.send({
      from: `Earlymark Demo Leads <sales@${fromDomain}>`,
      to: [to],
      replyTo: input.email?.trim() || undefined,
      subject: buildSubject(input),
      text: buildText(input),
      html: buildHtml(input),
    }),
  );

  return { sent: true, skipped: false } as const;
}
