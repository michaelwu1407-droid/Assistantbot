import { normalizePhone, phoneMatches } from "@/lib/phone-utils";

export { phoneMatches } from "@/lib/phone-utils";

function splitNumbers(raw?: string) {
  return (raw || "")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getKnownEarlymarkInboundNumbers(): string[] {
  const values = [
    ...splitNumbers(process.env.EARLYMARK_INBOUND_PHONE_NUMBERS),
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
    process.env.EARLYMARK_PHONE_NUMBER,
    process.env.TWILIO_PHONE_NUMBER,
  ]
    .filter(Boolean)
    .map((value) => normalizePhone(value))
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function isKnownEarlymarkInboundNumber(phone?: string | null): boolean {
  return getKnownEarlymarkInboundNumbers().some((value) => phoneMatches(value, phone));
}

export function getExpectedVoiceGatewayUrl() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) return "";
  return `${baseUrl}/api/webhooks/twilio-voice-gateway`;
}

export function getExpectedSmsWebhookUrl() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) return "";
  return `${baseUrl}/api/twilio/webhook`;
}
