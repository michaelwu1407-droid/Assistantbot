"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "./workspace-actions";

export async function getOnboardingProgress() {
    const userId = await getAuthUserId();
    if (!userId) return { complete: true, progress: 100, steps: [] };

    const workspaceView = await getOrCreateWorkspace(userId);
    const workspaceId = workspaceView.id;

    const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { createdAt: true },
    });

    // Only show the widget if they signed up within the last ~60 days (or "first month" per requirements, I'll use 30)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!workspace || workspace.createdAt < thirtyDaysAgo) {
        return { shouldShow: false, completed: 0, total: 5, steps: [] };
    }

    const [businessProfile, services, templates, documents] = await Promise.all([
        db.businessProfile.findUnique({ where: { userId } }),
        db.serviceItem.count({ where: { businessProfile: { userId } } }),
        db.smsTemplate.count({ where: { userId } }),
        db.businessDocument.count({ where: { workspaceId } }),
    ]);

    const steps = [
        {
            id: "profile",
            title: "Add your Business Details",
            isComplete: !!(businessProfile?.businessName && businessProfile?.publicPhone && businessProfile?.baseSuburb),
            href: "/dashboard/settings/my-business",
        },
        {
            id: "services",
            title: "List your Services",
            isComplete: services > 0,
            href: "/dashboard/settings/my-business", // or services
        },
        {
            id: "agent_mode",
            title: "Configure AI Voice Preferences",
            isComplete: true, // Completed in onboarding wizard already
            href: "/dashboard/settings/agent",
        },
        {
            id: "templates",
            title: "Set up SMS Templates",
            isComplete: templates > 0,
            href: "/dashboard/settings/sms-templates",
        },
        {
            id: "documents",
            title: "Upload Knowledge & Price Guides",
            isComplete: documents > 0,
            href: "/dashboard/settings/my-business",
        },
    ];

    const completed = steps.filter((s) => s.isComplete).length;
    const isAllComplete = completed === steps.length;

    return {
        shouldShow: !isAllComplete,
        completed,
        total: steps.length,
        steps,
    };
}
