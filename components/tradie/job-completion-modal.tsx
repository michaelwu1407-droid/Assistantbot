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
import { completeJob, sendReviewRequestSMS } from "@/actions/tradie-actions";
import { toast } from "sonner";
import { CheckCircle2, Star, Send } from "lucide-react";

interface JobCompletionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dealId: string;
    onSuccess: () => void;
}

export function JobCompletionModal({ open, onOpenChange, dealId, onSuccess }: JobCompletionModalProps) {
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [sendingReview, setSendingReview] = useState(false);

    const handleComplete = async () => {
        if (!signature) return;

        setLoading(true);
        try {
            const result = await completeJob(dealId, signature);
            if (result.success) {
                toast.success("Job completed successfully!");
                setCompleted(true);
                onSuccess();
            } else {
                toast.error("Failed to complete job");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleSendReview = async () => {
        setSendingReview(true);
        try {
            const result = await sendReviewRequestSMS(dealId);
            if (result.success) {
                toast.success("Review request sent!");
            } else {
                toast.error(result.error || "Failed to send review request");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setSendingReview(false);
            onOpenChange(false);
            setCompleted(false);
            setSignature(null);
        }
    };

    const handleSkipReview = () => {
        onOpenChange(false);
        setCompleted(false);
        setSignature(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {!completed ? (
                    <>
                        <DialogHeader>
                            <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <DialogTitle className="text-center">Complete Job</DialogTitle>
                            <DialogDescription className="text-center">
                                Please collect the client&apos;s signature to finalize this job.
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
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="mx-auto bg-amber-100 p-3 rounded-full mb-4">
                                <Star className="h-6 w-6 text-amber-600" />
                            </div>
                            <DialogTitle className="text-center">Send Review Request?</DialogTitle>
                            <DialogDescription className="text-center">
                                Job complete! Would you like to send the client a Google Review request via SMS?
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex-col gap-2 sm:flex-col">
                            <Button
                                onClick={handleSendReview}
                                disabled={sendingReview}
                                className="bg-amber-500 hover:bg-amber-600 text-white w-full gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {sendingReview ? "Sending..." : "Send Review Request"}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleSkipReview}
                                className="w-full text-slate-500"
                            >
                                Skip for now
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
