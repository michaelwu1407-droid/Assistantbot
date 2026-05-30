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

    // The widget shows for any workspace that still has incomplete setup
    // steps, regardless of age. New lead channels (LSA, Meta, etc.) and
    // recovery cases (provisioning failed) are valuable to surface for
    // existing tradies too — they shouldn't be hidden after 30 days.
    if (!workspace) {
        return { shouldShow: false, completed: 0, total: 0, steps: [] };
    }

    const [businessProfile, services, pricedServices, templates, documents, workspaceMeta, inboxConnections] = await Promise.all([
        db.businessProfile.findUnique({ where: { userId } }),
        db.serviceItem.count({ where: { businessProfile: { userId } } }),
        db.serviceItem.count({ where: { businessProfile: { userId }, OR: [{ priceMin: { gt: 0 } }, { priceMax: { gt: 0 } }] } }),
        db.smsTemplate.count({ where: { userId } }),
        db.businessDocument.count({ where: { workspaceId } }),
        db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                twilioPhoneNumber: true, ownerId: true,
                subscriptionStatus: true, settings: true,
            },
        }),
        // Count workspace-wide — a teammate inherits the owner's connection
        // for lead-capture purposes (hipages emails the owner's registered
        // address, not each teammate). Per-user count would misleadingly
        // tell teammates to connect their own inbox when the workspace is
        // already capturing leads through the owner's.
        db.emailIntegration.count({
            where: {
                user: { workspaceId },
                isActive: true,
                OR: [{ tokenExpiry: null }, { tokenExpiry: { gt: new Date() } }],
            },
        }),
    ]);

    const isOwner = workspaceMeta?.ownerId === userId;
    const wsSettings = (workspaceMeta?.settings as Record<string, unknown> | null) ?? {};
    const provisioningStatus = wsSettings.onboardingProvisioningStatus as string | undefined;
    const subscriptionActive = workspaceMeta?.subscriptionStatus === "active";

    // Distinguish three "no number" states so we don't nag tradies during
    // states they can't fix:
    //   - Pending: Stripe not yet confirmed OR provisioning attempt in flight
    //     → no checklist step. The system will finish on its own.
    //   - Failed: provisioning genuinely failed → owner sees recovery step.
    //   - Legacy: an older workspace that never had auto-provision run →
    //     owner sees a one-time claim step.
    // Teammates never see any of this; workspace infra isn't theirs.
    const hasNumber = !!workspaceMeta?.twilioPhoneNumber;
    const isPendingProvision = !hasNumber && (
        !subscriptionActive ||
        provisioningStatus === "provisioning" ||
        provisioningStatus === "requested"
    );
    const isFailedProvision = !hasNumber && !isPendingProvision && provisioningStatus === "failed";

    const phoneStep = (!isOwner || hasNumber || isPendingProvision)
        ? []
        : [{
            id: "phone_number" as const,
            title: isFailedProvision
                ? "Your business number didn't set up — click to retry"
                : "Claim your business number",
            isComplete: false,
            href: "/crm/settings",
        }];

    const steps = [
        ...phoneStep,
        {
            id: "connect_inbox",
            title: "Connect your inbox, then check Lead Channels for what goes live next",
            isComplete: inboxConnections > 0,
            href: "/crm/settings/integrations#lead-channels",
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
            id: "pricing",
            title: "Add pricing so Tracey quotes correctly",
            isComplete: pricedServices > 0,
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
