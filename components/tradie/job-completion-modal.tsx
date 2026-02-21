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
import { completeJob, finalizeJobCompletion } from "@/actions/tradie-actions";
import { toast } from "sonner";
import { CheckCircle2, Star, Send, Receipt, CreditCard, PenLine, User, MapPin } from "lucide-react";
import { MessageActionSheet } from "@/components/sms/message-action-sheet";
import { Job } from "@/components/map/map-view";
import { cn } from "@/lib/utils";

interface JobCompletionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dealId: string;
    job?: Job; // Optional fast-path context for the map view
    onSuccess: () => void;
}

export function JobCompletionModal({ open, onOpenChange, dealId, job, onSuccess }: JobCompletionModalProps) {
    const [signature, setSignature] = useState<string | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);

    const handleComplete = async () => {
        // Enforce signature if this is the standard job flow 
        if (!signature && !job) return;

        setLoading(true);
        try {
            // 1. Core Signature / Old Workflow Completion
            let sigSuccess = true;
            if (signature) {
                const sigResult = await completeJob(dealId, signature);
                sigSuccess = sigResult.success;
            }

            // 2. New Payment & Notes Payload 
            if (sigSuccess) {
                const finalizeResult = await finalizeJobCompletion(dealId, { isPaid, notes });
                if (finalizeResult.success) {
                    toast.success("Job completed successfully!");
                    setCompleted(true);
                    onSuccess();
                } else {
                    toast.error(finalizeResult.error || "Failed to finalize details");
                }
            } else {
                toast.error("Failed to complete job");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenActionSheet = () => {
        onOpenChange(false);
        setShowActionSheet(true);
    };

    const handleSkipReview = () => {
        onOpenChange(false);
        setCompleted(false);
        setSignature(null);
    };

    const handleActionSheetClose = (isOpen: boolean) => {
        setShowActionSheet(isOpen);
        if (!isOpen) {
            setCompleted(false);
            setSignature(null);
        }
    };

    return (
        <>
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

                            {job && (
                                <div className="px-4 py-2 mt-2 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center border border-slate-300">
                                            <User className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 leading-tight truncate">{job.clientName}</h4>
                                            <p className="text-slate-600 text-xs mt-0.5 truncate font-medium">{job.title}</p>
                                        </div>
                                        {job.value > 0 && (
                                            <div className="text-right">
                                                <span className="font-bold text-emerald-600">${job.value}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                                {/* Payment Toggle */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-blue-500" /> Payment Status
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsPaid(true)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
                                                isPaid ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"
                                            )}
                                        >
                                            <CreditCard className={cn("h-5 w-5 mb-1", isPaid && "text-blue-600")} />
                                            <span className="text-xs font-bold">Paid on Site</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPaid(false)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
                                                !isPaid ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500"
                                            )}
                                        >
                                            <Receipt className={cn("h-5 w-5 mb-1", !isPaid && "text-amber-500")} />
                                            <span className="text-xs font-bold">Invoice Later</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Notes Textarea */}
                                <div className="space-y-3 mt-4">
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <PenLine className="h-4 w-4 text-purple-500" />
                                        Field Notes <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add context e.g. 'Found a separate leak...'"
                                        className="w-full min-h-[80px] border-2 border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                    />
                                </div>

                                {/* Signature Pad */}
                                <div className="mt-4">
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                                        Customer Signature {job && <span className="text-slate-400 font-normal text-xs">(Optional for Maps)</span>}
                                    </label>
                                    <SignaturePad onSave={setSignature} />
                                </div>
                            </div>

                            <DialogFooter className="flex-col sm:justify-between gap-2 mt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleComplete}
                                    disabled={loading || (!signature && !job)}
                                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                                >
                                    {loading ? "Finalizing..." : "Complete & Save Docs"}
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
                                    Job complete! Send the client a review request via SMS or email?
                                </DialogDescription>
                            </DialogHeader>

                            <DialogFooter className="flex-col gap-2 sm:flex-col">
                                <Button
                                    onClick={handleOpenActionSheet}
                                    className="bg-amber-500 hover:bg-amber-600 text-white w-full gap-2"
                                >
                                    <Send className="h-4 w-4" />
                                    Preview & Send Message
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

            <MessageActionSheet
                open={showActionSheet}
                onOpenChange={handleActionSheetClose}
                jobId={dealId}
                triggerEvent="JOB_COMPLETE"
            />
        </>
    );
}
