"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createCustomerPortalSession } from "@/actions/billing-actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ManageSubscriptionButton({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false);

    const handleManage = async () => {
        try {
            setLoading(true);
            await createCustomerPortalSession(workspaceId);
        } catch (error) {
            console.error("Failed to open customer portal:", error);
            toast.error("Could not reach the billing portal — please try again in a moment.");
            setLoading(false);
        }
    };

    return (
        <Button variant="outline" onClick={handleManage} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Manage"}
        </Button>
    );
}
