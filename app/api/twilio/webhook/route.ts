import { NextRequest, NextResponse } from "next/server"
import { db as prisma } from "@/lib/db"
import MessagingResponse from "twilio/lib/twiml/MessagingResponse"
import { generateSMSResponse } from "@/lib/ai/sms-agent"

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const From = formData.get("From") as string
        const Body = formData.get("Body") as string
        const MessageSid = formData.get("MessageSid") as string

        if (!From || !Body) {
            return NextResponse.json({ error: "Missing From or Body" }, { status: 400 })
        }

        // 1. Find or Create Contact
        const defaultWorkspace = await prisma.workspace.findFirst()
        if (!defaultWorkspace) {
            return NextResponse.json({ error: "No workspace" }, { status: 500 })
        }

        let contact = await prisma.contact.findFirst({
            where: { phone: From }
        })

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    name: "Unknown Sender",
                    phone: From,
                    workspaceId: defaultWorkspace.id
                }
            })
        }

        // 2. Find or Create Recent Interaction (Session)
        // Rule: If an active SMS interaction exists within last 24h, append to it. Else create new.
        let interaction = await prisma.interaction.findFirst({
            where: {
                contactId: contact.id,
                type: "SMS",
                updatedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            orderBy: { updatedAt: "desc" }
        })

        if (!interaction) {
            interaction = await prisma.interaction.create({
                data: {
                    type: "SMS",
                    direction: "INBOUND",
                    status: "active",
                    contactId: contact.id,
                    summary: "New SMS conversation"
                }
            })
        }

        // 3. Log User Message
        await prisma.message.create({
            data: {
                content: Body,
                role: "user",
                externalId: MessageSid,
                interactionId: interaction.id
            }
        })

        // 4. Generate AI Response
        const aiResponseText = await generateSMSResponse(interaction.id, Body, defaultWorkspace.id)

        // 5. Log Assistant Message
        await prisma.message.create({
            data: {
                content: aiResponseText,
                role: "assistant",
                interactionId: interaction.id
            }
        })

        // 6. Return TwiML
        const twiml = new MessagingResponse()
        twiml.message(aiResponseText)

        return new NextResponse(twiml.toString(), {
            headers: { "Content-Type": "text/xml" }
        })

    } catch (error) {
        console.error("Twilio Webhook Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
