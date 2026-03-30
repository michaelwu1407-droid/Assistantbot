import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { getBillingIntervalForPriceId, getPlanLabelForPriceId } from "@/lib/billing-plan";
import { isManagerOrAbove } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
    // RBAC: Team members cannot access billing
    if (!(await isManagerOrAbove())) {
        redirect("/crm/settings");
    }

    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId);
    const billingInterval = getBillingIntervalForPriceId(workspace.stripePriceId);

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Billing</h3>
                <p className="text-slate-500 text-sm">
                    Check your plan and manage your billing.
                </p>
            </div>
            <Separator />

            <div className="max-w-md bg-white dark:bg-slate-900 rounded-xl border p-6 flex flex-col gap-4">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500">Plan</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        {getPlanLabelForPriceId(workspace.stripePriceId)}
                    </span>
                    <span className="text-sm text-slate-500 mt-1">
                        {billingInterval ? `${billingInterval} billing` : "No paid plan"}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                            {workspace.subscriptionStatus || "Active"}
                        </span>
                    </div>
                </div>

                <ManageSubscriptionButton workspaceId={workspace.id} />
            </div>
        </div>
    );
}


