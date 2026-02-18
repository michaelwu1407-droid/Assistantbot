"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Get all customer feedback for a workspace.
 */
export async function getWorkspaceFeedback(workspaceId: string) {
    try {
        const feedback = await db.customerFeedback.findMany({
            where: {
                deal: { workspaceId }
            },
            include: {
                contact: { select: { name: true } },
                deal: { select: { title: true } }
            },
            orderBy: [
                { resolved: "asc" },   // Unresolved first
                { score: "asc" },      // Lowest scores first
                { createdAt: "desc" }
            ]
        });

        return feedback.map(f => ({
            id: f.id,
            score: f.score,
            comment: f.comment,
            resolved: f.resolved,
            resolution: f.resolution,
            contactName: f.contact?.name || "Unknown Contact",
            dealTitle: f.deal?.title || "Unknown Deal",
            createdAt: f.createdAt.toISOString()
        }));
    } catch (error) {
        console.error("Error fetching feedback:", error);
        return [];
    }
}

/**
 * Resolve a feedback item with internal notes.
 */
export async function resolveFeedback(feedbackId: string, resolution: string) {
    try {
        await db.customerFeedback.update({
            where: { id: feedbackId },
            data: {
                resolved: true,
                resolution
            }
        });

        revalidatePath("/dashboard/feedback");
        return { success: true };
    } catch (error) {
        console.error("Error resolving feedback:", error);
        return { success: false, error: "Failed to resolve feedback" };
    }
}

/**
 * Submit customer feedback (called from public feedback form or internally).
 */
export async function submitFeedback(dealId: string, contactId: string, score: number, comment?: string) {
    try {
        const feedback = await db.customerFeedback.create({
            data: {
                score,
                comment: comment || null,
                dealId,
                contactId
            }
        });

        // If score is low (≤6), create a notification for the workspace users
        if (score <= 6) {
            const deal = await db.deal.findUnique({
                where: { id: dealId },
                include: { workspace: { include: { users: true } }, contact: true }
            });

            if (deal) {
                for (const user of deal.workspace.users) {
                    await db.notification.create({
                        data: {
                            userId: user.id,
                            title: "⚠️ Low Customer Feedback",
                            message: `${deal.contact.name} gave a score of ${score}/10 for "${deal.title}". Resolve before they post a public review.`,
                            type: "WARNING",
                            link: "/dashboard/feedback"
                        }
                    });
                }
            }
        }

        revalidatePath("/dashboard/feedback");
        return { success: true, id: feedback.id };
    } catch (error) {
        console.error("Error submitting feedback:", error);
        return { success: false, error: "Failed to submit feedback" };
    }
}
