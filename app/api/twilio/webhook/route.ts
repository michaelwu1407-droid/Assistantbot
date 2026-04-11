import { NextRequest, NextResponse } from "next/server"
import { db as prisma } from "@/lib/db"
import { waitUntil } from "@vercel/functions"
import { classifyMessage } from "@/lib/spam-classifier"
import { getWorkspaceTwilioClient } from "@/lib/twilio"
import { generateSMSResponse } from "@/lib/ai/sms-agent"
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing"
import { saveTriageRecommendation, triageIncomingLead } from "@/lib/ai/triage"

export const maxDuration = 60;

type SmsWebhookEventStatus = "success" | "error";

type SmsWebhookEventPayload = {
    workspaceId?: string;
    workspaceName?: string;
    from?: string | null;
    to?: string | null;
    messageSid?: string | null;
    responseMessageSid?: string | null;
    autoRespondEnabled?: boolean;
};

const ACTIVE_DEAL_STAGES = ["NEW", "CONTACTED", "NEGOTIATION", "SCHEDULED", "PIPELINE", "INVOICED", "PENDING_COMPLETION"] as const;

function looksLikeNewSmsLead(message: string): boolean {
    const text = message.trim().toLowerCase();
    if (!text || text.length < 8) return false;
    if (/^(ok|okay|yes|no|thanks|thank you|confirm|cancel|stop)\b/.test(text)) return false;

    return /\b(quote|quoted|price|cost|estimate|book|booking|job|repair|fix|install|installation|service|replace|blocked|leak|burst|drain|toilet|tap|hot water|no power|sparking|urgent|emergency|asap|can you|need|looking for)\b/.test(text);
}

async function recordSmsWebhookEvent(params: {
    eventType: "sms.received" | "sms.reply";
    status: SmsWebhookEventStatus;
    payload: SmsWebhookEventPayload;
    error?: string;
}) {
    try {
        await prisma.webhookEvent.create({
            data: {
                provider: "twilio",
                eventType: params.eventType,
                status: params.status,
                payload: params.payload,
                error: params.error || null,
            }
        })
    } catch (eventError) {
        console.error("[SMS Webhook] Failed to record webhook event:", eventError)
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const From = formData.get("From") as string
        const To = formData.get("To") as string
        const Body = formData.get("Body") as string
        const MessageSid = formData.get("MessageSid") as string

        if (!From || !Body || !To) {
            console.error("[SMS Webhook] Missing From, To, or Body")
            await recordSmsWebhookEvent({
                eventType: "sms.received",
                status: "error",
                payload: {
                    from: From || null,
                    to: To || null,
                    messageSid: MessageSid || null,
                },
                error: "Missing From, To, or Body",
            })
            return new NextResponse("OK", { status: 200 })
        }

        if (process.env.NODE_ENV !== "test") {
            console.log(`[SMS Webhook] Received message from ${From} to ${To}: ${Body}`)
        }

        // 1. Identify Workspace via the Twilio Number (Multi-Tenant Routing)
        const workspace = await findWorkspaceByTwilioNumber(To)

        if (!workspace) {
            if (process.env.NODE_ENV !== "test") {
                console.error(`[SMS Webhook] Received SMS to ${To} but no matching Workspace was found.`)
            }
            await recordSmsWebhookEvent({
                eventType: "sms.received",
                status: "error",
                payload: {
                    from: From,
                    to: To,
                    messageSid: MessageSid || null,
                },
                error: `No matching workspace found for ${To}`,
            })
            return new NextResponse("OK", { status: 200 })
        }

        await recordSmsWebhookEvent({
            eventType: "sms.received",
            status: "success",
            payload: {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                from: From,
                to: To,
                messageSid: MessageSid || null,
            },
        })

        let contact = await findContactByPhone(workspace.id, From)

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    name: "Unknown Sender",
                    phone: From,
                    workspaceId: workspace.id
                }
            })
        }

        // 2. Find or Create Recent Activity (Session)
        // Rule: If an active SMS activity exists within last 24h, append to it. Else create new.
        let interaction = await prisma.activity.findFirst({
            where: {
                contactId: contact.id,
                type: "NOTE",
                createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            orderBy: { createdAt: "desc" }
        })

        if (!interaction) {
            interaction = await prisma.activity.create({
                data: {
                    type: "NOTE",
                    title: "SMS Conversation",
                    description: "Active",
                    contactId: contact.id,
                    content: "New SMS conversation"
                }
            })
        }

        // 3. Log User Message
        await prisma.chatMessage.create({
            data: {
                content: Body,
                role: "user",
                workspaceId: workspace.id,
                metadata: {
                    externalId: MessageSid,
                    activityId: interaction.id,
                    contactId: contact.id,
                    channel: "sms",
                    direction: "inbound",
                    from: From,
                    to: To,
                }
            }
        })

        // 4. Process in background — return 200 immediately to prevent Twilio timeouts
        const interactionId = interaction.id;
        const workspaceId = workspace.id;
        const contactId = contact.id;

        const processPromise = (async () => {
            try {
                // ─── Booking Confirmation Fast-Path ──────────────────────
                // If the customer replies "CONFIRM" (or "YES"), find the most
                // recent pending-confirmation deal and mark it confirmed.
                if (/^(confirm|confirmed|yes|yep|yeah|yup|ok|okay|sounds good)\b/i.test(Body.trim())) {
                    try {
                        const pendingDeal = await prisma.deal.findFirst({
                            where: {
                                workspaceId,
                                contactId: contact.id,
                                metadata: { path: ["confirmationStatus"], equals: "pending" },
                            },
                            orderBy: { scheduledAt: "asc" },
                            select: { id: true, title: true, contactId: true, metadata: true },
                        });
                        if (pendingDeal) {
                            const existingMeta = (pendingDeal.metadata as Record<string, unknown>) ?? {};
                            await prisma.deal.update({
                                where: { id: pendingDeal.id },
                                data: {
                                    metadata: JSON.parse(JSON.stringify({
                                        ...existingMeta,
                                        confirmationStatus: "confirmed",
                                        confirmedAt: new Date().toISOString(),
                                    })),
                                },
                            });
                            await prisma.activity.create({
                                data: {
                                    type: "NOTE",
                                    title: "Booking confirmed by customer",
                                    content: `Customer replied "${Body.trim()}" to confirm the booking.`,
                                    dealId: pendingDeal.id,
                                    contactId: pendingDeal.contactId ?? undefined,
                                },
                            });
                        }
                    } catch {
                        // Non-blocking — confirmation update failure must not stop the AI reply
                    }
                }

                // ─── Spam Check ─────────────────────────────────────────
                const spamResult = await classifyMessage(workspaceId, Body, From);

                if (spamResult.classification === "spam") {
                    if (process.env.NODE_ENV !== "test") {
                        console.log(`[SMS Webhook] Spam filtered: ${spamResult.reason}`);
                    }
                    await prisma.activity.create({
                        data: {
                            type: "NOTE",
                            title: "SMS Filtered: Spam",
                            contactId,
                            content: `From: ${From}\nMessage: ${Body}\nReason: ${spamResult.reason}\nConfidence: ${(spamResult.confidence * 100).toFixed(0)}%`,
                        },
                    });
                    return;
                }

                // ─── AI Response Generation ─────────────────────────────
                let activeDeal = await prisma.deal.findFirst({
                    where: {
                        workspaceId,
                        contactId,
                        stage: { in: [...ACTIVE_DEAL_STAGES] },
                    },
                    orderBy: { updatedAt: "desc" },
                    select: { id: true },
                });

                if (!activeDeal && looksLikeNewSmsLead(Body)) {
                    const deal = await prisma.deal.create({
                        data: {
                            workspaceId,
                            contactId,
                            title: `SMS enquiry from ${contact.name || From}`,
                            stage: "NEW",
                            source: "sms",
                            metadata: {
                                leadSource: "sms",
                                initialMessage: Body,
                                inboundMessageSid: MessageSid || null,
                            },
                        },
                        select: { id: true },
                    });
                    activeDeal = deal;

                    await prisma.activity.create({
                        data: {
                            type: "NOTE",
                            title: "SMS enquiry captured",
                            content: Body,
                            contactId,
                            dealId: deal.id,
                        },
                    });

                    const triage = await triageIncomingLead(workspaceId, {
                        title: `SMS enquiry from ${contact.name || From}`,
                        description: Body,
                    }).catch(() => null);

                    if (triage) {
                        await saveTriageRecommendation(deal.id, triage).catch(() => {});
                    }

                    if (triage?.recommendation === "HOLD_REVIEW") {
                        const owner = await prisma.user.findFirst({
                            where: { workspaceId, role: "OWNER" },
                            select: { id: true },
                        }).catch(() => null);
                        if (owner) {
                            await prisma.notification.create({
                                data: {
                                    userId: owner.id,
                                    title: "SMS lead held for review",
                                    message: `${contact.name || From}: ${(triage.flags.length > 0 ? triage.flags : ["Needs review"]).join("; ")}`,
                                    type: "WARNING",
                                    link: `/crm/deals/${deal.id}`,
                                },
                            }).catch(() => {});
                        }

                        await recordSmsWebhookEvent({
                            eventType: "sms.reply",
                            status: "success",
                            payload: {
                                workspaceId,
                                workspaceName: workspace.name,
                                from: To,
                                to: From,
                                messageSid: MessageSid || null,
                                autoRespondEnabled: false,
                            },
                        });
                        return;
                    }
                }

                const aiResponse = await generateSMSResponse(interactionId, Body, workspaceId);
                const aiResponseText = aiResponse.text;

                // Log Assistant Message
                await prisma.chatMessage.create({
                    data: {
                        content: aiResponseText,
                        role: "assistant",
                        workspaceId,
                        metadata: {
                            activityId: interactionId,
                            contactId,
                            channel: "sms",
                            customerContactMode: aiResponse.policyOutcome.mode,
                            responsePolicyOutcome: aiResponse.policyOutcome,
                        }
                    }
                })

                // ─── Send Response via Twilio REST API ──────────────────
                const client = getWorkspaceTwilioClient(workspace);
                if (client && workspace.twilioPhoneNumber) {
                    const sentMessage = await client.messages.create({
                        from: To,
                        to: From,
                        body: aiResponseText,
                    });
                    await recordSmsWebhookEvent({
                        eventType: "sms.reply",
                        status: "success",
                        payload: {
                            workspaceId,
                            workspaceName: workspace.name,
                            from: To,
                            to: From,
                            messageSid: MessageSid || null,
                            responseMessageSid: sentMessage.sid,
                            autoRespondEnabled: true,
                        },
                    })
                } else {
                    const errorMessage = `[SMS Webhook] No usable Twilio messaging client configured for workspace ${workspaceId}. Cannot send reply.`
                    console.error(errorMessage, {
                        workspaceId,
                        hasPhoneNumber: !!workspace.twilioPhoneNumber,
                        hasSubaccountId: !!workspace.twilioSubaccountId,
                        hasSubaccountAuthToken: !!workspace.twilioSubaccountAuthToken,
                    });
                    await recordSmsWebhookEvent({
                        eventType: "sms.reply",
                        status: "error",
                        payload: {
                            workspaceId,
                            workspaceName: workspace.name,
                            from: To,
                            to: From,
                            messageSid: MessageSid || null,
                            autoRespondEnabled: true,
                        },
                        error: errorMessage,
                    })
                }
            } catch (err) {
                console.error("[SMS Webhook] Error processing message in background:", err);
                await recordSmsWebhookEvent({
                    eventType: "sms.reply",
                    status: "error",
                    payload: {
                        workspaceId,
                        workspaceName: workspace.name,
                        from: To,
                        to: From,
                        messageSid: MessageSid || null,
                        autoRespondEnabled: true,
                    },
                    error: err instanceof Error ? err.message : "Unknown SMS processing error",
                })
            }
        })();

        waitUntil(processPromise);

        return new NextResponse("OK", { status: 200 })

    } catch (error) {
        console.error("[SMS Webhook] Fatal error:", error)
        await recordSmsWebhookEvent({
            eventType: "sms.received",
            status: "error",
            payload: {},
            error: error instanceof Error ? error.message : "Unknown fatal SMS webhook error",
        })
        // Always return 200 to prevent Twilio retry storms
        return new NextResponse("OK", { status: 200 })
    }
}
