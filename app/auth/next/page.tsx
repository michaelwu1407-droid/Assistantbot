import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";

/**
 * After sign-in/sign-up: existing users with an active subscription and
 * completed onboarding go to dashboard (chatbot). Everyone else goes to
 * billing (new signups pay, then go to setup → onboarding + tutorial).
 */
export default async function AuthNextPage() {
    const userId = await getAuthUserId();
    if (!userId) {
        redirect("/auth");
    }

    let workspace;
    try {
        workspace = await getOrCreateWorkspace(userId);
    } catch {
        redirect("/billing");
    }

    const subscribed = workspace.subscriptionStatus === "active";
    const onboarded = workspace.onboardingComplete === true;

    if (subscribed && onboarded) {
        redirect("/dashboard");
    }
    if (subscribed && !onboarded) {
        redirect("/setup");
    }
    redirect("/billing");
}
