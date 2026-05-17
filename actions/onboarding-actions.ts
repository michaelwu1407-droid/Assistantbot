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

    const [businessProfile, services, templates, documents, workspaceMeta, inboxConnections] = await Promise.all([
        db.businessProfile.findUnique({ where: { userId } }),
        db.serviceItem.count({ where: { businessProfile: { userId } } }),
        db.smsTemplate.count({ where: { userId } }),
        db.businessDocument.count({ where: { workspaceId } }),
        db.workspace.findUnique({
            where: { id: workspaceId },
            select: { twilioPhoneNumber: true, ownerId: true },
        }),
        db.emailIntegration.count({ where: { userId, isActive: true } }),
    ]);

    const isOwner = workspaceMeta?.ownerId === userId;
    const needsPhoneRecovery = isOwner && !workspaceMeta?.twilioPhoneNumber;

    // Only surface the phone-number step in the rare recovery case: this
    // user is the workspace owner AND the workspace doesn't have a number
    // (auto-provision happens at signup, so normally there's nothing to do
    // here). Teammates never see it; they don't manage workspace infra.
    const phoneStep = needsPhoneRecovery
        ? [{
            id: "phone_number" as const,
            title: "Your business number isn't set up — click to retry",
            isComplete: false,
            href: "/crm/settings",
        }]
        : [];

    const steps = [
        ...phoneStep,
        {
            id: "connect_inbox",
            title: "Connect your inbox to capture hipages, Airtasker & website leads",
            isComplete: inboxConnections > 0,
            href: "/crm/settings/integrations",
        },
        {
            id: "profile",
            title: "Add your Business Details",
            isComplete: !!(businessProfile?.businessName && businessProfile?.publicPhone && businessProfile?.baseSuburb),
            href: "/crm/settings/my-business",
        },
        {
            id: "services",
            title: "List your Services",
            isComplete: services > 0,
            href: "/crm/settings/my-business",
        },
        {
            id: "templates",
            title: "Set up SMS Templates",
            isComplete: templates > 0,
            href: "/crm/settings/sms-templates",
        },
        {
            id: "documents",
            title: "Upload Knowledge & Price Guides",
            isComplete: documents > 0,
            href: "/crm/settings/my-business",
        },
    ];

    const completed = steps.filter((s) => s.isComplete).length;
    const isAllComplete = completed === steps.length;
    const firstWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return {
        shouldShow: !isAllComplete,
        isWithinFirstWeek: !!workspace && workspace.createdAt >= firstWeekAgo,
        completed,
        total: steps.length,
        steps,
    };
}
