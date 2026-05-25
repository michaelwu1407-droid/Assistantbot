"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelSubscriptionAtPeriodEnd } from "@/actions/billing-actions";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CancelSubscriptionButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelSubscriptionAtPeriodEnd(workspaceId);
      if (!result.success) {
        toast.error(result.error ?? "Could not cancel subscription — please try again.");
        return;
      }
      toast.success("Your subscription has been cancelled. You'll keep access until the end of your billing period.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not cancel subscription — please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        Cancel subscription
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="ott-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel your subscription?
            </DialogTitle>
            <DialogDescription>
              Before you go, here's what happens when you cancel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Your Tracey number will be released at the end of your billing period. You won't be able to reclaim it.</p>
            <p>You can export your data first — it's yours to keep.</p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/export/workspace-data" download>Export my data</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              Keep my subscription
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
