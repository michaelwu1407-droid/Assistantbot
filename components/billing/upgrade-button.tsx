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
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
    const [provisionPhoneNumberRequested, setProvisionPhoneNumberRequested] = useState(initialProvisionPhoneNumberRequested);

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            await createCheckoutSession(workspaceId, billingPeriod, provisionPhoneNumberRequested);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            setLoading(false);
        }
    };

    const monthlyPrice = "A$30";
    const yearlyMonthlyEquiv = "A$24";
    const yearlyTotal = "A$288";

    return (
        <div className="space-y-4">
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
                        Best value
                    </span>
                </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                {billingPeriod === "monthly" ? (
                    <div className="text-3xl font-extrabold text-primary">
                        {monthlyPrice} <span className="text-lg font-semibold text-muted-foreground">/ month</span>
                    </div>
                ) : (
                    <>
                        <div className="text-3xl font-extrabold text-midnight">
                            {yearlyMonthlyEquiv} <span className="text-lg font-semibold text-muted-foreground">/ month</span>
                        </div>
                        <div className="text-xs text-muted-foreground">billed {yearlyTotal}/year — save 20%</div>
                    </>
                )}
                <div className="text-sm text-slate-500 font-medium mt-0.5">+ 10¢ per call minute or text</div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
                {billingPeriod === "monthly"
                    ? "Billed monthly. Cancel anytime."
                    : "Billed A$288/year. Cancel anytime. Promo codes accepted at checkout."}
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Provision mobile business number</p>
                        <p className="text-xs text-muted-foreground">
                            Temporary beta option. Turn this on before payment if you want Earlymark to provision your dedicated AU mobile number after Stripe succeeds.
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
                disabled={loading}
            >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Continue to Stripe checkout`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                {provisionPhoneNumberRequested
                    ? "Your paid workspace will be eligible for AU mobile-number provisioning after Stripe succeeds."
                    : "You can still pay and complete onboarding without a Twilio number. Leave this off if you do not want provisioning during beta."}
            </p>
        </div>
    );
}
