import { NextResponse } from "next/server";
import { processAgentCommand } from "@/lib/services/ai-agent";
import { db } from "@/lib/db";
import { findUserByPhone } from "@/lib/workspace-routing";
import { sendWhatsApp } from "@/lib/twilio/whatsapp";
import { parseActionCode, resolveAndExecute } from "@/lib/notifications/whatsapp-reply-parser";
import { runIdempotent } from "@/lib/idempotency";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";
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

    // Twilio retries deliver the same MessageSid for the same inbound message.
    // Wrap the rest of the work so a retry does not double-fire the AI agent
    // or send a second outbound WhatsApp message.
    const dedupKey = messageSid || `${cleanNumber}:${body.slice(0, 64)}:${Math.floor(Date.now() / 60_000)}`;
    const idempotency = await runIdempotent({
      actionType: "whatsapp.inbound",
      parts: [dedupKey],
      bucketAt: new Date(),
      resultFactory: () => processWhatsappMessage({ user, body, cleanNumber, inboundPayload }),
      waitForCompletionMs: 4000,
    });

    if (!idempotency.created) {
      console.log(`[WhatsApp Webhook] Deduped retry for MessageSid=${messageSid}`);
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

async function processWhatsappMessage(args: {
  user: Awaited<ReturnType<typeof findUserByPhone>>;
  body: string;
  cleanNumber: string;
  inboundPayload: { userId: string; workspaceId?: string; from: string; bodyLength: number };
}): Promise<{ handled: boolean; reason?: string }> {
  const { user, body, cleanNumber, inboundPayload } = args;
  if (!user) return { handled: false, reason: "no_user" };

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

  // Action-code pre-parse: handle deterministic replies before AI agent
    const parsed = parseActionCode(body);
    if (parsed) {
      const outcome = await resolveAndExecute(user, parsed).catch(() => ({ handled: false as const }));
      if (outcome.handled) {
        await db.webhookEvent
          .create({
            data: {
              provider: "twilio",
              eventType: "whatsapp.reply.action_code",
              status: "success",
              payload: { userId: user.id, verb: parsed.verb, suffix: parsed.suffix },
            },
          })
          .catch(() => {});
        try {
          await sendWhatsApp(cleanNumber, outcome.reply);
        } catch (sendErr) {
          console.error("[WhatsApp Webhook] Error sending action-code reply:", sendErr);
        }
        return { handled: true, reason: "action_code" };
      }
      // Notification not found for this user → fall through to AI agent
    }

    // AI agent fallback
    if (parsed) {
      await db.webhookEvent
        .create({
          data: {
            provider: "twilio",
            eventType: "whatsapp.reply.ai_fallback",
            status: "received",
            payload: { userId: user.id, reason: "notification_not_found" },
          },
        })
        .catch(() => {});
    }

    try {
      const aiResponse = await processAgentCommand(user.id, body);

      if (!parsed) {
        await db.webhookEvent
          .create({
            data: {
              provider: "twilio",
              eventType: "whatsapp.reply.ai_fallback",
              status: "received",
              payload: { userId: user.id, reason: "no_action_code" },
            },
          })
          .catch(() => {});
      }

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

  return { handled: true };
}
