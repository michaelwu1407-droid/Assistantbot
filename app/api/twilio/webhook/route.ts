import { NextRequest, NextResponse } from "next/server"
import { db as prisma } from "@/lib/db"
import { waitUntil } from "@vercel/functions"
import { classifyMessage } from "@/lib/spam-classifier"
import { getWorkspaceTwilioClient } from "@/lib/twilio"
import { generateSMSResponse } from "@/lib/ai/sms-agent"
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing"

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const From = formData.get("From") as string
        const To = formData.get("To") as string
        const Body = formData.get("Body") as string
        const MessageSid = formData.get("MessageSid") as string

        if (!From || !Body || !To) {
            console.error("[SMS Webhook] Missing From, To, or Body")
            return new NextResponse("OK", { status: 200 })
        }

        console.log(`[SMS Webhook] Received message from ${From} to ${To}: ${Body}`)

        // 1. Identify Workspace via the Twilio Number (Multi-Tenant Routing)
        const workspace = await findWorkspaceByTwilioNumber(To, {
            id: true,
            settings: true,
            twilioPhoneNumber: true,
            twilioSubaccountId: true,
            twilioSubaccountAuthToken: true,
        })

        if (!workspace) {
            console.error(`[SMS Webhook] Received SMS to ${To} but no matching Workspace was found.`)
            return new NextResponse("OK", { status: 200 })
        }

        let contact = await findContactByPhone(workspace.id, From, {
            id: true,
            name: true,
            phone: true,
        })

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
                metadata: { externalId: MessageSid, activityId: interaction.id, contactId: contact.id }
            }
        })

        const wsSettings = (workspace.settings as Record<string, unknown>) ?? {}
        const autoRespondToMessages = (wsSettings.autoRespondToMessages as boolean) ?? true
        if (!autoRespondToMessages) {
            return new NextResponse("OK", { status: 200 })
        }

        // 4. Process in background — return 200 immediately to prevent Twilio timeouts
        const interactionId = interaction.id;
        const workspaceId = workspace.id;
        const contactId = contact.id;

        const processPromise = (async () => {
            try {
                // ─── Spam Check ─────────────────────────────────────────
                const spamResult = await classifyMessage(workspaceId, Body, From);

                if (spamResult.classification === "spam") {
                    console.log(`[SMS Webhook] Spam filtered: ${spamResult.reason}`);
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
                const aiResponseText = await generateSMSResponse(interactionId, Body, workspaceId);

                // Log Assistant Message
                await prisma.chatMessage.create({
                    data: {
                        content: aiResponseText,
                        role: "assistant",
                        workspaceId,
                        metadata: { activityId: interactionId, contactId }
                    }
                })

                // ─── Send Response via Twilio REST API ──────────────────
                const client = getWorkspaceTwilioClient(workspace);
                if (client && workspace.twilioPhoneNumber) {
                    await client.messages.create({
                        from: To,
                        to: From,
                        body: aiResponseText,
                    });
                } else {
                    console.error(`[SMS Webhook] No usable Twilio messaging client configured for workspace ${workspaceId}. Cannot send reply.`, {
                        workspaceId,
                        hasPhoneNumber: !!workspace.twilioPhoneNumber,
                        hasSubaccountId: !!workspace.twilioSubaccountId,
                        hasSubaccountAuthToken: !!workspace.twilioSubaccountAuthToken,
                    });
                }
            } catch (err) {
                console.error("[SMS Webhook] Error processing message in background:", err);
            }
        })();

        waitUntil(processPromise);

        return new NextResponse("OK", { status: 200 })

    } catch (error) {
        console.error("[SMS Webhook] Fatal error:", error)
        // Always return 200 to prevent Twilio retry storms
        return new NextResponse("OK", { status: 200 })
    }
}
