import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { classifyMessage } from "@/lib/spam-classifier"
import { findWorkspaceByInboundEmail } from "@/lib/workspace-routing"

// ─── Lead Provider Patterns (Tier 1) ────────────────────────────────
const LEAD_PROVIDERS: Record<string, RegExp> = {
    hipages: /@hipages\.com\.au/i,
    airtasker: /@airtasker\.com/i,
    serviceseeking: /@serviceseeking\.com\.au/i,
    bark: /@bark\.com/i,
    oneflare: /@oneflare\.com\.au/i,
}

// ─── Lead Keywords (Tier 2) ─────────────────────────────────────────
const LEAD_KEYWORDS = [
    /phone\s*:/i,
    /mobile\s*:/i,
    /job\s*(location|site|address)\s*:/i,
    /quote\s*request/i,
    /budget\s*:/i,
    /new\s*lead/i,
    /enquiry/i,
    /work\s*description/i,
    /booking\s*request/i,
    /callback/i,
    /urgent/i,
    /emergency/i,
]

export async function POST(req: Request) {
    try {
        let rawTo = ""
        let rawFrom = ""
        let textRaw = ""
        let subject = ""

        try {
            const json = await req.json()
            rawTo = json.to || json.recipient || ""
            rawFrom = json.from || json.sender || ""
            textRaw = json.text || json.html || json.body || ""
            subject = json.subject || ""
        } catch {
            const fd = await req.formData()
            rawTo = (fd.get("to") as string) || (fd.get("recipient") as string) || ""
            rawFrom = (fd.get("from") as string) || (fd.get("sender") as string) || ""
            textRaw = (fd.get("text") as string) || (fd.get("html") as string) || (fd.get("body-plain") as string) || ""
            subject = (fd.get("subject") as string) || ""
        }

        if (!rawTo || !textRaw) {
            return NextResponse.json({ error: "Missing recipient or body text" }, { status: 400 })
        }

        // Extract clean email address
        const emailMatch = rawTo.match(/<([^>]+)>/)
        const toEmail = (emailMatch ? emailMatch[1] : rawTo.trim()).toLowerCase()

        // Match Workspace
        const workspace = await findWorkspaceByInboundEmail(toEmail)

        if (!workspace) {
            return NextResponse.json({ error: "Workspace via inboundEmail not found" }, { status: 404 })
        }

        // ─── Tier 1: Known Lead Provider ────────────────────────────────
        const fromAddress = rawFrom.toLowerCase()
        const isKnownProvider = Object.entries(LEAD_PROVIDERS).some(
            ([, regex]) => regex.test(fromAddress)
        )

        // ─── Tier 2: Keyword presence ───────────────────────────────────
        const combinedText = `${subject} ${textRaw}`
        const hasLeadKeywords = LEAD_KEYWORDS.some((re) => re.test(combinedText))

        // ─── Spam Gate: if NOT a known provider AND no keywords → classify ─
        if (!isKnownProvider && !hasLeadKeywords) {
            // Classify with Gemini before spending more tokens on parsing
            const spamResult = await classifyMessage(workspace.id, textRaw, rawFrom)

            if (spamResult.classification === "spam") {
                // Log silently for audit, no Deal or Notification created
                console.log(`[email-webhook] Spam filtered: ${spamResult.reason} (confidence: ${spamResult.confidence})`)
                await db.activity.create({
                    data: {
                        type: "NOTE",
                        title: "📧 Email Filtered: Spam",
                        content: `From: ${rawFrom}\nSubject: ${subject}\nReason: ${spamResult.reason}\nConfidence: ${(spamResult.confidence * 100).toFixed(0)}%\n\nIf this is a real lead, tell Tracey: "An email from ${rawFrom} was marked as spam — it's actually a lead, please learn from it."`,
                    },
                })
                return NextResponse.json({ filtered: true, reason: spamResult.reason })
            }
        }

        // ─── Tier 3: LLM Parse — only reached if Tier 1/2 passed ───────
        const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: "No AI key configured" }, { status: 500 })
        }

        const google = createGoogleGenerativeAI({ apiKey })

        const parsedResult = await generateObject({
            model: google("gemini-2.0-flash-lite"),
            system: "You are a lead ingestion parser. Extract the client details from the provided lead email text (e.g., from Hipages or ServiceSeeking). Return null for fields you cannot confidently find.",
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
        let contactId: string | undefined
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

        if (!contactId) {
            const fallbackContact = await db.contact.create({
                data: {
                    workspaceId: workspace.id,
                    name: leadInfo.clientName || rawFrom || "Email Lead",
                    phone: leadInfo.phone || null,
                    email: leadInfo.email || null,
                    address: leadInfo.address || null,
                },
            })
            contactId = fallbackContact.id
        }

        // Create the Deal in the "NEW" stage
        const dealData = {
            workspaceId: workspace.id,
            title: `Lead: ${leadInfo.workDescription || "New Request"}`,
            stage: "NEW" as const,
            source: "email",
            address: leadInfo.address || null,
            metadata: {
                source: "email",
                originalBody: textRaw,
                tier: isKnownProvider ? "provider-match" : hasLeadKeywords ? "keyword-match" : "llm-classified",
            }
        }
        await db.deal.create({
            data: {
                ...dealData,
                contactId,
            },
        })

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

    } catch (err: unknown) {
        console.error("Email Webhook Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
