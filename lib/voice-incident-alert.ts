import { twilioMasterClient } from "@/lib/twilio";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";

const TWILIO_SMS_COST_USD = 0.05;
const RESEND_EMAIL_COST_USD = 0.001;

const DEFAULT_ALERT_SMS_TO = "+61434955958";
const DEFAULT_ALERT_EMAIL_TO = "michael.wu1407@gmail.com";

export type VoiceNotificationParams = {
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: {
    sms?: boolean;
    email?: boolean;
  };
};

function splitRecipients(raw?: string | null) {
  return (raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getAlertSmsRecipients() {
  const recipients = splitRecipients(process.env.VOICE_ALERT_SMS_TO);
  return recipients.length > 0 ? recipients : [DEFAULT_ALERT_SMS_TO];
}

function isSmsAlertingEnabled() {
  const raw = (process.env.VOICE_ALERT_SMS_ENABLED || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function getAlertEmailRecipients() {
  const recipients = splitRecipients(process.env.VOICE_ALERT_EMAIL_TO);
  return recipients.length > 0 ? recipients : [DEFAULT_ALERT_EMAIL_TO];
}

function getAlertSmsFrom() {
  return process.env.VOICE_ALERT_SMS_FROM || process.env.TWILIO_PHONE_NUMBER || null;
}

function getAlertEmailFrom() {
  if (process.env.VOICE_ALERT_EMAIL_FROM) {
    return process.env.VOICE_ALERT_EMAIL_FROM;
  }

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai";
  return `Earlymark Voice Alerts <alerts@${fromDomain}>`;
}

function renderMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return "";
  return `\n\n${JSON.stringify(metadata, null, 2)}`;
}

async function sendSmsNotifications(params: VoiceNotificationParams) {
  const recipients = getAlertSmsRecipients();

  if (params.channels?.sms === false) {
    return {
      sent: false,
      skipped: true,
      recipients,
      error: "SMS channel disabled for this voice alert",
    };
  }

  if (!isSmsAlertingEnabled()) {
    return {
      sent: false,
      skipped: true,
      recipients,
      error: "SMS alerting is disabled for voice alerts",
    };
  }

  const client = twilioMasterClient;
  const from = getAlertSmsFrom();

  if (!client || !from) {
    return {
      sent: false,
      skipped: true,
      recipients,
      error: "SMS alerting is not fully configured",
    };
  }

  const body = `${params.subject}\n\n${params.message}${renderMetadata(params.metadata)}`;
  await Promise.all(
    recipients.map((to) => {
      const safeTo = assertSafeRecipient("sms", to);
      return withCostCeiling("twilio", TWILIO_SMS_COST_USD, () =>
        client.messages.create({
          from,
          to: safeTo,
          body,
        }),
      );
    }),
  );

  return { sent: true, skipped: false, recipients };
}

async function sendEmailNotifications(params: VoiceNotificationParams) {
  const resendKey = process.env.RESEND_API_KEY;
  const recipients = getAlertEmailRecipients();

  if (params.channels?.email === false) {
    return {
      sent: false,
      skipped: true,
      recipients,
      error: "Email channel disabled for this voice alert",
    };
  }

  if (!resendKey) {
    return {
      sent: false,
      skipped: true,
      recipients,
      error: "Email alerting is not configured",
    };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const safeRecipients = recipients.map((email) => assertSafeRecipient("email", email));
  await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
    resend.emails.send({
      from: getAlertEmailFrom(),
      to: safeRecipients,
      subject: params.subject,
      text: `${params.message}${renderMetadata(params.metadata)}`,
    }),
  );

  return { sent: true, skipped: false, recipients };
}

export async function dispatchVoiceIncidentNotifications(params: VoiceNotificationParams) {
  const [sms, email] = await Promise.allSettled([
    sendSmsNotifications(params),
    sendEmailNotifications(params),
  ]);

  return {
    sms: sms.status === "fulfilled" ? sms.value : { sent: false, skipped: false, error: sms.reason instanceof Error ? sms.reason.message : String(sms.reason) },
    email: email.status === "fulfilled" ? email.value : { sent: false, skipped: false, error: email.reason instanceof Error ? email.reason.message : String(email.reason) },
  };
}
