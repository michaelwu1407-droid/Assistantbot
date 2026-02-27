import { Separator } from "@/components/ui/separator";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
    const userId = await getAuthUserId();
    const workspace = await getOrCreateWorkspace(userId);

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Billing & Subscription</h3>
                <p className="text-slate-500 text-sm">
                    Manage your Stripe subscription status, view active invoices, and update billing methods.
                </p>
            </div>
            <Separator />

            <div className="max-w-md bg-white dark:bg-slate-900 rounded-xl border p-6 flex flex-col gap-4">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500">Current Plan</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                        Earlymark Pro
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
