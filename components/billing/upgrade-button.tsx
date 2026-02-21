"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing-actions";
import { Loader2 } from "lucide-react";

export function UpgradeButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        try {
            setLoading(true);
            await createCheckoutSession(workspaceId);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            setLoading(false);
        }
    };

    return (
        <Button
            size="lg"
            className="w-full text-lg shadow-xl shadow-primary/20"
            onClick={handleUpgrade}
            disabled={loading}
        >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Subscribe to Pro ($89/mo)"}
        </Button>
    );
}
