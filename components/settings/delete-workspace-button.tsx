"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Trash2, Undo2 } from "lucide-react";
import { scheduleWorkspaceDeletion, cancelWorkspaceDeletion } from "@/actions/user-actions";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface Props {
  userId: string;
  scheduledForDeletionAt?: Date | null;
}

export function DeleteWorkspaceButton({ userId, scheduledForDeletionAt }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === "DELETE";

  const handleSchedule = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      const result = await scheduleWorkspaceDeletion(userId, "User requested deletion from Privacy settings");
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong. Please contact support.");
        setLoading(false);
        return;
      }
      toast.success(`Workspace scheduled for deletion on ${formatDate(result.scheduledForDeletionAt!)}.`);
      setOpen(false);
      setConfirmation("");
    } catch {
      toast.error("Failed to schedule deletion. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelWorkspaceDeletion(userId);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success("Workspace deletion cancelled.");
    } catch {
      toast.error("Failed to cancel. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (scheduledForDeletionAt) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="app-body-primary text-destructive">
            Workspace scheduled for deletion on <strong>{formatDate(scheduledForDeletionAt)}</strong>.
          </p>
          <p className="app-body-secondary mt-0.5">All data will be permanently removed on that date.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
          Cancel deletion
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Delete my workspace
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) setOpen(v); }}>
        <DialogContent className="ott-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              Your workspace will be scheduled for permanent deletion in 30 days.
              You can cancel within that window. After 30 days, all data is gone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Download your data first if you want to keep a record. Then type{" "}
              <strong className="text-foreground">DELETE</strong> to confirm.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
              <Input
                id="confirm-delete"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSchedule}
              disabled={!canDelete || loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Schedule deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
