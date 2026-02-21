import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingPaywallPage() {
    let workspace;
    try {
        const userId = await getAuthUserId();
        workspace = await getOrCreateWorkspace(userId);
    } catch (error) {
        redirect("/auth");
    }

    if (workspace.subscriptionStatus === "active") {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 ott-glow -z-10" />

            <div className="w-full max-w-md ott-card bg-card p-8 relative z-10 text-center">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <span className="text-white font-extrabold italic text-lg tracking-tighter">Pj</span>
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold text-midnight tracking-tight mb-3">Upgrade to Pro</h1>
                <p className="text-muted-foreground text-sm mb-8">
                    You've completed onboarding. A Pro subscription is required to govern your AI Agents, automate your workflows, and access the Pj Buddy CRM.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl p-6 text-left mb-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unlimited Multi-Agent Orchestration</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Intelligent Scheduling & Invoicing</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Automated Webhooks & Triage</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Real-time Map & Route Optimization</span>
                    </div>
                </div>

                <UpgradeButton workspaceId={workspace.id} />
            </div>

            <div className="mt-8 text-xs text-muted-foreground opacity-60">
                Secure payments powered by Stripe &bull; Cancel anytime
            </div>
        </div>
    );
}
