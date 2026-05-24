"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing-actions";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function UpgradeButton({
    workspaceId,
}: {
    workspaceId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
    const provisionPhoneNumberRequested = true;

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            await createCheckoutSession(workspaceId, billingPeriod, provisionPhoneNumberRequested);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            toast.error("Could not start checkout — please try again in a moment.");
            setLoading(false);
        }
    };

    const monthlyPrice = "A$30";
    const yearlyMonthlyEquiv = "A$24";
    const yearlyTotal = "A$288";

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-1 bg-muted dark:bg-slate-800 rounded-xl">
                <button
                    type="button"
                    onClick={() => setBillingPeriod("monthly")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${billingPeriod === "monthly"
                        ? "bg-card dark:bg-slate-700 shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Monthly
                </button>
                <button
                    type="button"
                    onClick={() => setBillingPeriod("yearly")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all relative ${billingPeriod === "yearly"
                        ? "bg-card dark:bg-slate-700 shadow-sm text-foreground"
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
                <div className="text-sm text-muted-foreground font-medium mt-0.5">+ 10¢ per call minute or text</div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
                {billingPeriod === "monthly"
                    ? "Billed monthly. Cancel anytime."
                    : "Billed A$288/year. Cancel anytime. Promo codes accepted at checkout."}
            </p>

            <Button
                size="lg"
                className="w-full text-lg shadow-xl shadow-primary/20"
                onClick={handleUpgrade}
                disabled={loading}
            >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Continue to Stripe checkout`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                Your Tracey AU mobile number will be set up automatically after payment.
            </p>
        </div>
    );
}
