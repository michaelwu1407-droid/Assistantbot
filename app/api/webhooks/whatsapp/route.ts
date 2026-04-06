import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { processAgentCommand } from "@/lib/services/ai-agent";
import twilio from "twilio";
import { classifyMessage } from "@/lib/spam-classifier";
import { db } from "@/lib/db";
import { findUserByPhone } from "@/lib/workspace-routing";

export const maxDuration = 60; // Allow 60s for Vercel Pro/Hobby wait times

// Initialize twilio client using master config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const from = formData.get("From")?.toString() || "";
        const body = formData.get("Body")?.toString() || "";
        console.log(`[WhatsApp Webhook] Received message from ${from}: ${body}`);

        // Twilio WhatsApp numbers are prefixed with "whatsapp:"
        const cleanNumber = from.replace("whatsapp:", "").trim();

        if (!cleanNumber) {
            console.warn("[WhatsApp Webhook] No 'From' number provided.");
            return new NextResponse("OK", { status: 200 }); // Always 200 to prevent retry loops
        }

        // Authenticate user by phone bypassing RLS
        // In our schema, `phone` is the personal phone field on `User`.
        const user = await findUserByPhone(cleanNumber);

        if (!user) {
            // Unauthorized fallback
            console.warn(`[WhatsApp Webhook] Unrecognized number: ${cleanNumber}`);
            if (twilioClient && twilioWhatsAppNumber) {
                try {
                    await twilioClient.messages.create({
                        from: `whatsapp:${twilioWhatsAppNumber}`,
                        to: `whatsapp:${cleanNumber}`,
                        body: "🚫 Number not recognized. Please ensure your personal mobile number is saved in your Earlymark settings."
                    });
                } catch (twilioErr) {
                    console.error("[WhatsApp Webhook] Error sending unauthorized message:", twilioErr);
                }
            }
            return new NextResponse("OK", { status: 200 });
        }

        // Authorized User: pass to AI logic handler safely in background
        const processPromise = (async () => {
            try {
                // ─── Spam Check ─────────────────────────────────────────────────
                const spamResult = await classifyMessage(user.id, body, `whatsapp:${cleanNumber}`);

                if (spamResult.classification === "spam") {
                    console.log(`[WhatsApp Webhook] Spam filtered: ${spamResult.reason}`);
                    await db.activity.create({
                        data: {
                            type: "NOTE",
                            title: "💬 SMS/WhatsApp Filtered: Spam",
                            userId: user.id,
                            content: `From: ${cleanNumber}\nMessage: ${body}\nReason: ${spamResult.reason}\nConfidence: ${(spamResult.confidence * 100).toFixed(0)}%\n\nIf this was a real message, tell Tracey: "A message from ${cleanNumber} was marked as spam — it's actually real, please learn from it."`,
                        },
                    });
                    // Do not process further, but don't send an error to the user
                    return;
                }

                // ─── Real Message Processing ────────────────────────────────────
                db.webhookEvent.create({
                    data: {
                        provider: "twilio",
                        eventType: "whatsapp.inbound",
                        status: "received",
                        payload: { userId: user.id, workspaceId: user.workspaceId ?? undefined, from: cleanNumber, bodyLength: body.length },
                    },
                }).catch(() => {});

                const aiResponse = await processAgentCommand(user.id, body);

                // Reply to user
                if (twilioClient && twilioWhatsAppNumber) {
                    let sid: string | undefined;
                    try {
                        const msg = await twilioClient.messages.create({
                            from: `whatsapp:${twilioWhatsAppNumber}`,
                            to: `whatsapp:${cleanNumber}`,
                            body: aiResponse
                        });
                        sid = msg.sid;
                    } catch (sendErr) {
                        db.webhookEvent.create({
                            data: {
                                provider: "twilio",
                                eventType: "whatsapp.outbound",
                                status: "error",
                                payload: { userId: user.id, error: sendErr instanceof Error ? sendErr.message : String(sendErr) },
                            },
                        }).catch(() => {});
                        throw sendErr;
                    }
                    db.webhookEvent.create({
                        data: {
                            provider: "twilio",
                            eventType: "whatsapp.outbound",
                            status: "success",
                            payload: { sid, userId: user.id, workspaceId: user.workspaceId ?? undefined },
                        },
                    }).catch(() => {});
                }
            } catch (aiErr) {
                console.error("[WhatsApp Webhook] Error processing AI command:", aiErr);
                // Send a generic error reply
                if (twilioClient && twilioWhatsAppNumber) {
                    try {
                        await twilioClient.messages.create({
                            from: `whatsapp:${twilioWhatsAppNumber}`,
                            to: `whatsapp:${cleanNumber}`,
                            body: "⚠️ The system encountered an error while processing your request. Please try again later."
                        });
                    } catch (twilioErr) {
                        console.error("[WhatsApp Webhook] Error sending fallback system error:", twilioErr);
                    }
                }
            }
        })();

        waitUntil(processPromise);

        return new NextResponse("OK", { status: 200 });
    } catch (error) {
        console.error("[WhatsApp Webhook] Fatal system error:", error);
        // Always return 200 OK so Twilio doesn't retry indefinitely
        return new NextResponse("OK", { status: 200 });
    }
}
