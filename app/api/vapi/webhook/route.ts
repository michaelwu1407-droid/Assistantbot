import { NextRequest, NextResponse } from "next/server"
import { db as prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json()
        const { message } = payload

        // Only process end-of-call reports or call-analysis to avoid duplicates
        if (message?.type !== "end-of-call-report") {
            return NextResponse.json({ status: "ignored", reason: "Not an end-of-call report" })
        }

        const { call, analysis, summary, recordingUrl, artifact } = message

        if (!call) {
            return NextResponse.json({ status: "error", reason: "No call data found" }, { status: 400 })
        }

        const customerNumber = call.customer?.number
        if (!customerNumber) {
            return NextResponse.json({ status: "ignored", reason: "No customer number" })
        }

        // 1. Find or Create Contact
        // In a real app, we'd scope this by Workspace (maybe via Vapi Org ID map or phone number map)
        // For now, we'll search across all contracts or assume a default workspace if none found
        // TODO: Improve Workspace resolution. defaulting to first workspace for safety or just searching by phone.

        let contact = await prisma.contact.findFirst({
            where: { phone: customerNumber }
        })

        if (!contact) {
            // Find a default workspace to attach to (e.g. the first one)
            const defaultWorkspace = await prisma.workspace.findFirst()
            if (!defaultWorkspace) {
                console.error("No workspace found to create contact")
                return NextResponse.json({ status: "error", reason: "No workspace" }, { status: 500 })
            }

            contact = await prisma.contact.create({
                data: {
                    name: "Unknown Caller",
                    phone: customerNumber,
                    workspaceId: defaultWorkspace.id
                }
            })
        }

        // 2. Create Activity Record
        const interaction = await prisma.activity.create({
            data: {
                type: "CALL",
                title: "Inbound Vapi Call", // Vapi mostly handles inbound for now
                description: call.status || "completed",
                content: `Duration: ${Math.round(call.durationSeconds || 0)}s\n\n${summary || analysis?.summary || "No summary provided"}`,
                contactId: contact.id,
            }
        })

        return NextResponse.json({ status: "success", activityId: interaction.id })

    } catch (error) {
        console.error("Vapi Webhook Error:", error)
        return NextResponse.json({ status: "error", error: "Internal Server Error" }, { status: 500 })
    }
}
