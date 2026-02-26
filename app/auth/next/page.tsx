import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { logger } from "@/lib/logging";

/**
 * Auth flow after login/signup (from /auth or OAuth callback):
 * - Active subscription → dashboard
 * - No active subscription (including former users who stopped paying) → billing
 */
export const dynamic = 'force-dynamic';

export default async function AuthNextPage() {
    logger.authFlow("Auth next page - starting flow", { action: "auth_next_page" });

    const userId = await getAuthUserId();
    if (!userId) {
        logger.authFlow("No userId found, redirecting to /auth", { action: "redirect_to_auth" });
        redirect("/auth");
    }

    let workspace;
    try {
        logger.authFlow("Getting workspace for user", { userId, action: "get_workspace" });
        workspace = await getOrCreateWorkspace(userId);

        logger.authFlow("Workspace data retrieved", {
            action: "workspace_retrieved",
            workspaceId: workspace.id,
            subscriptionStatus: workspace.subscriptionStatus,
            onboardingComplete: workspace.onboardingComplete,
            ownerId: workspace.ownerId
        });
    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.authError("Error getting workspace, redirecting to /auth", {
            userId,
            error: errorObj.message,
            action: "workspace_error_redirect"
        }, errorObj);
        redirect("/auth");
    }

    const subscribed = workspace.subscriptionStatus === "active";
    const onboarded = workspace.onboardingComplete;

    logger.authFlow("Making redirect decision", {
        action: "redirect_decision",
        userId,
        workspaceId: workspace.id,
        subscribed,
        onboarded,
        redirectTarget: subscribed ? (onboarded ? "/dashboard" : "/setup") : "/billing"
    });

    if (!subscribed) {
        logger.authFlow("Redirecting to /billing", {
            userId,
            workspaceId: workspace.id,
            reason: "no_active_subscription"
        });
        redirect("/billing");
    }

    if (!onboarded) {
        logger.authFlow("Redirecting to /setup", {
            userId,
            workspaceId: workspace.id,
            reason: "onboarding_incomplete"
        });
        redirect("/setup");
    }

    logger.authFlow("Redirecting to /dashboard", {
        userId,
        workspaceId: workspace.id,
        reason: "subscription_active_and_onboarding_complete"
    });
    redirect("/dashboard");
}
