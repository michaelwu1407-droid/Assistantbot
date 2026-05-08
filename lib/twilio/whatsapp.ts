import twilio from "twilio";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber =
  process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

const TWILIO_WHATSAPP_COST_USD = 0.05;

export async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient || !twilioWhatsAppNumber) return null;
  const safeTo = assertSafeRecipient("whatsapp", to);
  return withCostCeiling("twilio", TWILIO_WHATSAPP_COST_USD, () =>
    twilioClient.messages.create({
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${safeTo}`,
      body,
    }),
  );
}
