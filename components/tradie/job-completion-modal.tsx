"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "./signature-pad";
import { completeJob } from "@/actions/tradie-actions";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

interface JobCompletionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dealId: string;
    onSuccess: () => void;
}

export function JobCompletionModal({ open, onOpenChange, dealId, onSuccess }: JobCompletionModalProps) {
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        if (!signature) return;

        setLoading(true);
        try {
            const result = await completeJob(dealId, signature);
            if (result.success) {
                toast.success("Job completed successfully!");
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error("Failed to complete job");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <DialogTitle className="text-center">Complete Job</DialogTitle>
                    <DialogDescription className="text-center">
                        Please collect the client's signature to finalize this job.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <SignaturePad onSave={setSignature} />
                </div>

                <DialogFooter className="flex-col sm:justify-between gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleComplete}
                        disabled={!signature || loading}
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    >
                        {loading ? "Finalizing..." : "Complete Job"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
