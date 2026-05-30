import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";
import { getBillingIntervalForPriceId, getPlanLabelForPriceId } from "@/lib/billing-plan";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { formatDate } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
    let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>;
    try {
        actor = await requireCurrentWorkspaceAccess();
    } catch {
        redirect("/auth");
    }

    // RBAC: Team members cannot access billing
    if (actor.role === "TEAM_MEMBER") {
        redirect("/crm/settings");
    }

    const workspace = await db.workspace.findUnique({
        where: { id: actor.workspaceId },
        select: {
            id: true,
            stripePriceId: true,
            subscriptionStatus: true,
            stripeCurrentPeriodEnd: true,
        },
    });
    if (!workspace) {
        redirect("/crm/settings");
    }

    const billingInterval = getBillingIntervalForPriceId(workspace.stripePriceId);
    const status = workspace.subscriptionStatus || "active";
    const periodEnd = workspace.stripeCurrentPeriodEnd;
    const isCanceled = status === "canceled" || status === "canceling";
    const isInGracePeriod = isCanceled && periodEnd != null && periodEnd > new Date();

    const statusLabel = isCanceled ? (isInGracePeriod ? "Cancels soon" : "Cancelled") : status;
    const statusColor = isCanceled
        ? (isInGracePeriod ? "text-amber-600 dark:text-amber-400" : "text-destructive")
        : "text-[#00D28B] dark:text-emerald-400";
    const dotColor = isCanceled
        ? (isInGracePeriod ? "bg-amber-500" : "bg-destructive")
        : "bg-[#00D28B]";

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <h3 className="app-section-title">Billing</h3>
                <p className="app-body-secondary">
                    Check your plan and manage your billing.
                </p>
            </div>
            <Separator />

            {isInGracePeriod && periodEnd && (
                <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300 max-w-md">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-medium">Your subscription has been cancelled</p>
                        <p>You still have full access until <strong>{formatDate(periodEnd)}</strong>. After that your account will be locked.</p>
                        <p>Want to keep your data? <a href="/crm/settings/data-privacy" className="underline font-medium">Export your data</a> before access ends.</p>
                    </div>
                </div>
            )}

            <div className="max-w-md bg-card dark:bg-slate-900 rounded-xl border p-6 flex flex-col gap-4">
                <div className="flex flex-col">
                    <span className="app-field-label">Plan</span>
                    <span className="app-kpi-value">
                        {getPlanLabelForPriceId(workspace.stripePriceId)}
                    </span>
                    <span className="app-body-secondary mt-1">
                        {billingInterval ? `${billingInterval} billing` : "No paid plan"}
                        {periodEnd && !isCanceled && (
                            <> · renews {formatDate(periodEnd)}</>
                        )}
                    </span>
                </div>

                <div className="flex flex-col">
                    <span className="app-field-label">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`}></span>
                        </span>
                        <span className={`text-sm font-medium capitalize ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                  <ManageSubscriptionButton workspaceId={workspace.id} />
                  {!isCanceled && <CancelSubscriptionButton workspaceId={workspace.id} />}
                </div>
            </div>
        </div>
    );
}
