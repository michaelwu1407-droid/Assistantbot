import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

export async function POST(req: Request) {
    try {
        // Many email providers (SendGrid, Mailgun) send payload as FormData or JSON.
        // We will try JSON first for simplicity/testing, fallback to FormData.
        let body
        let rawTo = ""
        let textRaw = ""

        try {
            body = await req.json()
            rawTo = body.to || body.recipient || ""
            textRaw = body.text || body.html || body.body || ""
        } catch {
            const fd = await req.formData()
            rawTo = (fd.get("to") as string) || (fd.get("recipient") as string) || ""
            textRaw = (fd.get("text") as string) || (fd.get("html") as string) || (fd.get("body-plain") as string) || ""
        }

        if (!rawTo || !textRaw) {
            return NextResponse.json({ error: "Missing recipient or body text" }, { status: 400 })
        }

        // Extract clean email address
        const emailMatch = rawTo.match(/<([^>]+)>/)
        const toEmail = emailMatch ? emailMatch[1] : rawTo.trim()

        // Match Workspace
        const workspace = await db.workspace.findFirst({
            where: { inboundEmail: toEmail }
        })

        if (!workspace) {
            return NextResponse.json({ error: "Workspace via inboundEmail not found" }, { status: 404 })
        }

        // Use Gemini to parse the Hipages/Lead email
        const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "No AI key configured" }, { status: 500 })
        }

        const google = createGoogleGenerativeAI({ apiKey })

        const parsedResult = await generateObject({
            model: google("gemini-2.0-flash-lite"),
            system: "You are a lead ingestion parser. Extract the client details from the provided lead email text (e.g., from Hipages atau ServiceSeeking). Return null for fields you cannot confidently find.",
            prompt: `Email body:\n\n${textRaw}`,
            schema: z.object({
                clientName: z.string().describe("The name of the client/lead"),
                phone: z.string().nullable().describe("Contact phone number"),
                email: z.string().nullable().describe("Contact email address"),
                address: z.string().nullable().describe("Location or address of the job"),
                workDescription: z.string().describe("A brief 5-10 word summary of what they need done"),
            })
        })

        const leadInfo = parsedResult.object

        // Build or find contact
        let contactId
        if (leadInfo.clientName) {
            const existing = await db.contact.findFirst({
                where: {
                    workspaceId: workspace.id,
                    OR: [
                        { name: { contains: leadInfo.clientName, mode: "insensitive" } },
                        ...(leadInfo.phone ? [{ phone: leadInfo.phone }] : [])
                    ]
                }
            })

            if (existing) {
                contactId = existing.id
            } else {
                const newContact = await db.contact.create({
                    data: {
                        workspaceId: workspace.id,
                        name: leadInfo.clientName,
                        phone: leadInfo.phone || null,
                        email: leadInfo.email || null,
                        address: leadInfo.address || null,
                    }
                })
                contactId = newContact.id
            }
        }

        // Create the Deal in the "NEW" stage
        const dealData: any = {
            workspaceId: workspace.id,
            title: `Lead: ${leadInfo.workDescription || "New Request"}`,
            stage: "NEW", // Drops fresh into the first column
            address: leadInfo.address || null,
            metadata: {
                source: "Email Parser",
                originalBody: textRaw,
            }
        }
        if (contactId) {
            dealData.contactId = contactId
        }

        await db.deal.create({ data: dealData })

        // Also create a "New Lead" notification
        await db.notification.create({
            data: {
                userId: workspace.ownerId || "",
                title: "📬 New Inbound Lead",
                message: `You received a new lead for ${leadInfo.workDescription || "a job"}.`,
                type: "SUCCESS",
                link: "/dashboard"
            }
        })

        return NextResponse.json({ success: true, parsed: leadInfo })

    } catch (err: any) {
        console.error("Email Webhook Error:", err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
