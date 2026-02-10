"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { JobStatus } from "@prisma/client";
import { logActivity } from "./activity-actions";

// --- Job Status Management ---

export async function updateJobStatus(dealId: string, status: JobStatus) {
    try {
        const deal = await db.deal.update({
            where: { id: dealId },
            data: { jobStatus: status },
            include: { contact: true }
        });

        // Log the activity
        await logActivity({
            type: "NOTE",
            title: `Job Status Updated: ${status}`,
            description: `Job checked into ${status} state`,
            content: "", // Required by ActivitySchema
            dealId: deal.id,
            contactId: deal.contactId,
        });

        // Auto-SMS logic for Travel
        if (status === "TRAVELING") {
            await sendTravelSMS(deal.id);
        }

        revalidatePath(`/dashboard/tradie/jobs/${dealId}`);
        return { success: true, data: deal };
    } catch (error) {
        console.error("Error updating job status:", error);
        return { success: false, error: "Failed to update job status" };
    }
}

export async function sendTravelSMS(dealId: string) {
    try {
        const deal = await db.deal.findUnique({
            where: { id: dealId },
            include: { contact: true }
        });

        if (!deal?.contact?.phone) {
            return { success: false, error: "No contact phone number" };
        }

        // Stub for Twilio integration
        console.log(`[SMS MOCK] Sending to ${deal.contact.phone}: Hi ${deal.contact.name}, I'm on my way to ${deal.title}. See you soon!`);

        await logActivity({
            type: "CALL", // Using CALL/EMAIL types as proxy for SMS for now
            title: "SMS Sent: On My Way",
            description: "Automated travel notification sent to client",
            content: `Hi ${deal.contact.name}, I'm on my way to ${deal.title}. See you soon!`,
            dealId: deal.id,
            contactId: deal.contactId,
        });

        return { success: true };
    } catch (error) {
        console.error("Error sending SMS:", error);
        return { success: false, error: "Failed to send SMS" };
    }
}

export async function completeSafetyCheck(dealId: string, checkData: any) {
    try {
        await db.deal.update({
            where: { id: dealId },
            data: { safetyCheckCompleted: true }
        });

        await logActivity({
            type: "NOTE",
            title: "Safety Check Completed",
            description: "Site safety assessment verified",
            content: JSON.stringify(checkData),
            dealId,
        });

        revalidatePath(`/dashboard/tradie/jobs/${dealId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to complete safety check" };
    }
}

export async function completeJob(dealId: string, signatureDataUrl: string) {
    try {
        // Get existing metadata
        const deal = await db.deal.findUnique({
            where: { id: dealId },
            select: { metadata: true }
        });

        const currentMetadata = (deal?.metadata as Record<string, any>) || {};

        await db.deal.update({
            where: { id: dealId },
            data: {
                jobStatus: "COMPLETED" as JobStatus,
                metadata: {
                    ...currentMetadata,
                    signature: signatureDataUrl,
                    completedAt: new Date().toISOString()
                }
            }
        });

        // Log the completion
        await logActivity({
            type: "NOTE",
            title: "Job Completed",
            description: "Job signed off by client",
            content: "Signature captured and stored in job record.",
            dealId,
        });

        revalidatePath(`/dashboard/tradie/jobs/${dealId}`);
        return { success: true };
    } catch (error) {
        console.error("Error completing job:", error);
        return { success: false, error: "Failed to complete job" };
    }
}
