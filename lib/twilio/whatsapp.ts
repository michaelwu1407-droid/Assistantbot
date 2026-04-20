import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber =
  process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient || !twilioWhatsAppNumber) return null;
  return twilioClient.messages.create({
    from: `whatsapp:${twilioWhatsAppNumber}`,
    to: `whatsapp:${to}`,
    body,
  });
}
