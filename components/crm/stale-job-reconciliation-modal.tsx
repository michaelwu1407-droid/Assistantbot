"use client";

import React, { useState } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { DealView } from "@/actions/deal-actions";
import { ActualOutcome } from "@/lib/deal-utils";
import { reconcileStaleJob } from "@/actions/stale-job-actions";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  StaleJobOutcomePicker,
  staleJobOutcomeLabel,
} from "./stale-job-outcome-picker";

interface Props {
  deal: DealView;
  onClose: () => void;
  onSuccess: () => void;
}

export function StaleJobReconciliationModal({ deal, onClose, onSuccess }: Props) {
  const isDesktop = useIsDesktop();
  const [actualOutcome, setActualOutcome] = useState<ActualOutcome | "">("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actualOutcome || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await reconcileStaleJob({
        dealId: deal.id,
        actualOutcome,
        outcomeNotes: outcomeNotes.trim() || null,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to update job");
        return;
      }
      toast.success("Job updated");
      onSuccess();
    } catch (error) {
      console.error("Failed to reconcile stale job:", error);
      toast.error("Failed to update job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scheduledLabel = deal.scheduledAt
    ? format(new Date(deal.scheduledAt), "MMM d, yyyy 'at' h:mm a")
    : "an unknown time";

  const titleText = "What happened with this job?";
  const descText = `Scheduled ${scheduledLabel} — no outcome recorded yet.`;

  const body = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground" style={{ background: "#F6F4EE", borderColor: "#E6E2D7" }}>
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          <span className="font-medium text-foreground">{deal.title}</span>
          {deal.contactName ? <> · {deal.contactName}</> : null}
          {deal.address ? <> · {deal.address}</> : null}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="app-field-label">Outcome</Label>
        <StaleJobOutcomePicker
          value={actualOutcome}
          onChange={setActualOutcome}
          layout={isDesktop ? "grid" : "list"}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="outcomeNotes" className="app-field-label">
          Notes <span className="font-normal text-muted-foreground">· optional</span>
        </Label>
        <Textarea
          id="outcomeNotes"
          placeholder="Anything that'd help future-you remember why?"
          value={outcomeNotes}
          onChange={(e) => setOutcomeNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!actualOutcome || isSubmitting} className="rounded-full" style={{ background: "#00D28B", color: "#0E1F1A" }}>
          {isSubmitting ? "Saving…" : staleJobOutcomeLabel(actualOutcome)}
        </Button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="ott-dialog max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 app-section-title">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              {titleText}
            </DialogTitle>
            <DialogDescription>{descText}</DialogDescription>
          </DialogHeader>
          <div className="mt-2">{body}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent className="max-h-[88vh] px-0 pb-6">
        <DrawerHeader className="px-5 pt-2 text-left">
          <DrawerTitle className="flex items-center gap-2 app-section-title">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {titleText}
          </DrawerTitle>
          <DrawerDescription>{descText}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-5">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}
