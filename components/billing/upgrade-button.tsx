"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing-actions";
import { Loader2 } from "lucide-react";

export function UpgradeButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false);
    const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            // Pass billing period preference to checkout
            await createCheckoutSession(workspaceId);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            setLoading(false);
        }
    };

    const monthlyPrice = 2;
    const monthlyOriginal = 5;
    const yearlyMonthly = 1.60; // 20% off
    const yearlySavings = 20;

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

            {/* Price display */}
            <div className="flex items-center justify-center gap-3 py-4">
                {billingPeriod === "monthly" ? (
                    <>
                        <span className="text-4xl font-extrabold text-red-500">${monthlyPrice}</span>
                        <span className="text-2xl font-bold text-muted-foreground line-through">${monthlyOriginal}</span>
                        <span className="text-muted-foreground text-sm">/day</span>
                    </>
                ) : (
                    <>
                        <span className="text-4xl font-extrabold text-red-500">${yearlyMonthly.toFixed(2)}</span>
                        <span className="text-2xl font-bold text-muted-foreground line-through">${monthlyPrice}</span>
                        <span className="text-muted-foreground text-sm">/day</span>
                    </>
                )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                {billingPeriod === "monthly"
                    ? "Monthly subscription. Cancel anytime."
                    : `Yearly subscription. Save ${yearlySavings}% — billed annually.`}
            </p>

            <Button
                size="lg"
                className="w-full text-lg shadow-xl shadow-primary/20"
                onClick={handleUpgrade}
                disabled={loading}
            >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : `Subscribe to Pro`}
            </Button>
        </div>
    );
}
