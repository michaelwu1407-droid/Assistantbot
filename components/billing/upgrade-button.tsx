"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing-actions";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function UpgradeButton({
    workspaceId,
    initialProvisionPhoneNumberRequested = false,
}: {
    workspaceId: string;
    initialProvisionPhoneNumberRequested?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
    const [provisionPhoneNumberRequested, setProvisionPhoneNumberRequested] = useState(initialProvisionPhoneNumberRequested);

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            // Pass billing period preference to checkout
            await createCheckoutSession(workspaceId, provisionPhoneNumberRequested);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            setLoading(false);
        }
    };

    const yearlySavings = 20;
    // TODO: Update prices at the end of promotional period - currently $2/day intro, $5/day regular
    // Yearly = $5/day * 30 days * 12 months * (1 - 20%)
    const yearlyTotal = 5 * 30 * 12 * (1 - yearlySavings / 100);

    return (
        <div className="space-y-4">
            {/* Billing period toggle */}
            <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                    type="button"
                    onClick={() => setBillingPeriod("monthly")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${billingPeriod === "monthly"
                        ? "bg-white dark:bg-slate-700 shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Monthly
                </button>
                <button
                    type="button"
                    onClick={() => setBillingPeriod("yearly")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all relative ${billingPeriod === "yearly"
                        ? "bg-white dark:bg-slate-700 shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Yearly
                    <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {yearlySavings}% OFF
                    </span>
                </button>
            </div>

            {/* Price display: Monthly = intro promo; Yearly = annual rate only */}
            <div className="flex flex-col items-center justify-center gap-2 py-4">
                {billingPeriod === "monthly" ? (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-3xl font-extrabold text-primary">$2</span>
                        <span className="text-2xl font-bold text-muted-foreground line-through">$5</span>
                        <span className="text-muted-foreground">/ day for a limited time only</span>
                    </div>
                ) : (
                    <div className="text-3xl font-extrabold text-midnight">
                        ${yearlyTotal.toLocaleString()} <span className="text-lg font-semibold text-muted-foreground">/ year</span>
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                {billingPeriod === "monthly"
                    ? "$60 / month subscription. Cancel anytime."
                    : "Cancel anytime."}
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Provision mobile business number</p>
                        <p className="text-xs text-muted-foreground">
                            Temporary beta gate. This must be on before payment so Earlymark can provision your dedicated AU mobile number after Stripe succeeds.
                        </p>
                    </div>
                    <Switch
                        checked={provisionPhoneNumberRequested}
                        onCheckedChange={setProvisionPhoneNumberRequested}
                        aria-label="Provision mobile business number"
                    />
                </div>
            </div>

            <Button
                size="lg"
                className="w-full text-lg shadow-xl shadow-primary/20"
                onClick={handleUpgrade}
                disabled={loading || !provisionPhoneNumberRequested}
            >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Subscribe to Pro`}
            </Button>
            {!provisionPhoneNumberRequested && (
                <p className="text-center text-xs text-amber-600">
                    Turn on mobile number provisioning to continue to Stripe during beta.
                </p>
            )}
        </div>
    );
}
