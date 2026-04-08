import { NextResponse } from "next/server";
import twilio from "twilio";
import { processAgentCommand } from "@/lib/services/ai-agent";
import { db } from "@/lib/db";
import { findUserByPhone } from "@/lib/workspace-routing";

export const maxDuration = 60;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber =
  process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient || !twilioWhatsAppNumber) return null;
  return twilioClient.messages.create({
    from: `whatsapp:${twilioWhatsAppNumber}`,
    to: `whatsapp:${to}`,
    body,
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    console.log(`[WhatsApp Webhook] Received message from ${from}: ${body}`);

    const cleanNumber = from.replace("whatsapp:", "").trim();

    if (!cleanNumber) {
      console.warn("[WhatsApp Webhook] No 'From' number provided.");
      return new NextResponse("OK", { status: 200 });
    }

    const user = await findUserByPhone(cleanNumber);

    if (!user) {
      console.warn(`[WhatsApp Webhook] Unrecognized number: ${cleanNumber}`);
      try {
        await sendWhatsApp(
          cleanNumber,
          "🚫 Number not recognized. Please ensure your personal mobile number is saved in your Earlymark settings.",
        );
      } catch (twilioErr) {
        console.error("[WhatsApp Webhook] Error sending unauthorized message:", twilioErr);
      }
      return new NextResponse("OK", { status: 200 });
    }

    const inboundPayload = {
      userId: user.id,
      workspaceId: user.workspaceId ?? undefined,
      from: cleanNumber,
      bodyLength: body.length,
    };

    await db.webhookEvent
      .create({
        data: {
          provider: "twilio",
          eventType: "whatsapp.inbound",
          status: "received",
          payload: inboundPayload,
        },
      })
      .catch((eventErr) => {
        console.error("[WhatsApp Webhook] Failed to record inbound event:", eventErr);
        return null;
      });

    try {
      const aiResponse = await processAgentCommand(user.id, body);

      try {
        const msg = await sendWhatsApp(cleanNumber, aiResponse);
        await db.webhookEvent.create({
          data: {
            provider: "twilio",
            eventType: "whatsapp.outbound",
            status: "success",
            payload: {
              sid: msg?.sid,
              userId: user.id,
              workspaceId: user.workspaceId ?? undefined,
            },
          },
        });
      } catch (sendErr) {
        await db.webhookEvent
          .create({
            data: {
              provider: "twilio",
              eventType: "whatsapp.outbound",
              status: "error",
              payload: {
                userId: user.id,
                workspaceId: user.workspaceId ?? undefined,
                error: sendErr instanceof Error ? sendErr.message : String(sendErr),
              },
            },
          })
          .catch(() => {});
        throw sendErr;
      }
    } catch (aiErr) {
      console.error("[WhatsApp Webhook] Error processing AI command:", aiErr);
      await db.webhookEvent
        .create({
          data: {
            provider: "twilio",
            eventType: "whatsapp.processing",
            status: "error",
            payload: {
              ...inboundPayload,
              error: aiErr instanceof Error ? aiErr.message : String(aiErr),
            },
          },
        })
        .catch(() => {});

      try {
        await sendWhatsApp(
          cleanNumber,
          "⚠️ The system encountered an error while processing your request. Please try again later.",
        );
      } catch (twilioErr) {
        console.error("[WhatsApp Webhook] Error sending fallback system error:", twilioErr);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fatal system error:", error);
    await db.webhookEvent
      .create({
        data: {
          provider: "twilio",
          eventType: "whatsapp.processing",
          status: "fatal",
          payload: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      })
      .catch(() => {});
    return new NextResponse("OK", { status: 200 });
  }
}
