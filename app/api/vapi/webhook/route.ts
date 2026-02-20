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

        // Vapi payload includes the number that the customer called (our system number)
        const systemNumber = call.phoneNumber?.number
        if (!systemNumber) {
            return NextResponse.json({ status: "error", reason: "Could not identify inbound system phone number" }, { status: 400 })
        }

        // 1. Find Workspace by matching the dialed System Number
        const workspace = await prisma.workspace.findFirst({
            where: { twilioPhoneNumber: systemNumber }
        })

        if (!workspace) {
            console.error(`[Vapi Webhook] No workspace found for inbound number: ${systemNumber}`)
            return NextResponse.json({ status: "error", reason: "Invalid Workspace Routing" }, { status: 404 })
        }

        // 2. Find or Create Contact scoped strictly to this Workspace
        let contact = await prisma.contact.findFirst({
            where: {
                phone: customerNumber,
                workspaceId: workspace.id
            }
        })

        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    name: "Unknown Caller",
                    phone: customerNumber,
                    workspaceId: workspace.id
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
