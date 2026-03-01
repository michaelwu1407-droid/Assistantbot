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
import { completeJob, finalizeJobCompletion, generateQuote } from "@/actions/tradie-actions";
import { updateDeal } from "@/actions/deal-actions";
import { createXeroDraftInvoice } from "@/actions/accounting-actions";
import { toast } from "sonner";
import { CheckCircle2, Star, Send, Receipt, CreditCard, PenLine, User, Upload, X, Clock, Wrench, Plus, Trash2, FileText } from "lucide-react";
import { MessageActionSheet } from "@/components/sms/message-action-sheet";
import { MaterialPicker } from "@/components/tradie/material-picker";
import { SignaturePad } from "@/components/tradie/signature-pad";
import { Job } from "@/components/map/map-view";
import { cn } from "@/lib/utils";

interface MaterialLine {
    description: string;
    price: number;
}

interface JobCompletionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dealId: string;
    job?: Job;
    onSuccess: () => void;
}

export function JobCompletionModal({ open, onOpenChange, dealId, job, onSuccess }: JobCompletionModalProps) {
    const [signature, setSignature] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [isPaid, setIsPaid] = useState(false);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);

    // Invoice Verifier state
    const [laborHours, setLaborHours] = useState<number>(1);
    const [laborRate, setLaborRate] = useState<number>(85); // Default hourly rate
    const [materials, setMaterials] = useState<MaterialLine[]>([]);

    const laborTotal = laborHours * laborRate;
    const materialsTotal = materials.reduce((sum, m) => sum + m.price, 0);
    const invoiceTotal = laborTotal + materialsTotal;

    const handleAddMaterial = (material: { description: string; price: number }) => {
        setMaterials((prev) => [...prev, material]);
    };

    const handleRemoveMaterial = (index: number) => {
        setMaterials((prev) => prev.filter((_, i) => i !== index));
    };

    const buildLineItems = () => {
        const items: { desc: string; price: number }[] = [];
        if (laborHours > 0) {
            items.push({ desc: `Labour — ${laborHours}h @ $${laborRate}/hr`, price: laborTotal });
        }
        for (const mat of materials) {
            items.push({ desc: mat.description, price: mat.price });
        }
        return items;
    };

    /** Save for Later — stage → INVOICED (Ready to Invoice), no Xero sync */
    const handleSaveForLater = async () => {
        setLoading(true);
        try {
            // Capture signature if present
            if (signature) {
                await completeJob(dealId, signature);
            }

            // Finalize with notes / payment info
            await finalizeJobCompletion(dealId, { isPaid, notes });

            // Move stage to INVOICED (ready_to_invoice) instead of WON
            await updateDeal(dealId, { stage: "ready_to_invoice" });

            toast.success("Job saved — ready for invoicing later.");
            setCompleted(true);
            onSuccess();
        } catch {
            toast.error("An error occurred saving the job.");
        } finally {
            setLoading(false);
        }
    };

    /** Confirm & Generate — stage → WON, generate invoice record, push Xero draft */
    const handleConfirmAndGenerate = async () => {
        setLoading(true);
        try {
            // 1. Capture signature if present
            if (signature) {
                const sigResult = await completeJob(dealId, signature);
                if (!sigResult.success) {
                    toast.error("Failed to capture signature");
                    setLoading(false);
                    return;
                }
            }

            // 2. Finalize payment / notes
            const finalizeResult = await finalizeJobCompletion(dealId, { isPaid, notes });
            if (!finalizeResult.success) {
                toast.error(finalizeResult.error || "Failed to finalize details");
                setLoading(false);
                return;
            }

            // 3. Generate internal invoice from verified line items
            const lineItems = buildLineItems();
            if (lineItems.length > 0) {
                await generateQuote(dealId, lineItems);
            }

            // 4. Ensure deal is WON (completed)
            await updateDeal(dealId, { stage: "completed" });

            // 5. Push Xero DRAFT invoice for manager review
            const xeroResult = await createXeroDraftInvoice(dealId);
            if (xeroResult.success) {
                toast.success("Invoice generated & sent to Xero as Draft!");
            } else {
                // Non-blocking: the invoice is created locally even if Xero sync fails
                toast.success("Invoice generated! Xero sync skipped — " + (xeroResult.error || "connect Xero in Settings."));
            }

            setCompleted(true);
            onSuccess();
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
        setFiles([]);
        setMaterials([]);
    };

    const handleActionSheetClose = (isOpen: boolean) => {
        setShowActionSheet(isOpen);
        if (!isOpen) {
            setCompleted(false);
            setSignature(null);
            setFiles([]);
            setMaterials([]);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = e.target.files;
        if (chosen) setFiles((prev) => [...prev, ...Array.from(chosen)]);
        e.target.value = "";
    };
    const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                    {!completed ? (
                        <>
                            <DialogHeader>
                                <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <DialogTitle className="text-center">Complete Job</DialogTitle>
                                <DialogDescription className="text-center">
                                    Verify the invoice details, then save or generate the invoice.
                                </DialogDescription>
                            </DialogHeader>

                            {job && (
                                <div className="px-4 py-2 mt-2 bg-slate-50 border border-slate-100 rounded-xl mb-2">
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

                            <div className="space-y-4 py-2 flex-1 overflow-y-auto px-2">
                                {/* ── Invoice Verifier Section ── */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
                                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        Invoice Verifier
                                    </h3>

                                    {/* Labor Hours */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-blue-500" /> Labour Hours
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.25}
                                                value={laborHours}
                                                onChange={(e) => setLaborHours(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-24 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-blue-500"
                                            />
                                            <span className="text-xs text-slate-500 self-center">hrs @</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step={5}
                                                value={laborRate}
                                                onChange={(e) => setLaborRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-24 border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-blue-500"
                                                placeholder="$/hr"
                                            />
                                            <span className="text-xs text-slate-500 self-center">= <b className="text-slate-900">${laborTotal.toFixed(2)}</b></span>
                                        </div>
                                    </div>

                                    {/* Materials */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                            <Wrench className="h-3.5 w-3.5 text-blue-500" /> Materials Used
                                        </label>

                                        {materials.length > 0 && (
                                            <div className="space-y-1.5">
                                                {materials.map((mat, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                                                        <span className="text-xs text-slate-700 truncate flex-1 mr-2">{mat.description}</span>
                                                        <span className="text-xs font-bold text-slate-900 mr-2">${mat.price.toFixed(2)}</span>
                                                        <button type="button" onClick={() => handleRemoveMaterial(i)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <MaterialPicker
                                            onSelect={handleAddMaterial}
                                            trigger={
                                                <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50 h-10">
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Material
                                                </Button>
                                            }
                                        />
                                    </div>

                                    {/* Invoice Total */}
                                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                                        <span className="text-sm font-bold text-blue-900">Invoice Total</span>
                                        <span className="text-lg font-extrabold text-emerald-600">${invoiceTotal.toFixed(2)}</span>
                                    </div>
                                </div>

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
                                <div className="space-y-3">
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

                                {/* Upload photos or files */}
                                <div>
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                                        <Upload className="h-4 w-4" />
                                        Upload photos or files
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={onFileChange}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                    />
                                    {files.length > 0 && (
                                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                            {files.map((f, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5">
                                                    <span className="truncate">{f.name}</span>
                                                    <button type="button" onClick={() => removeFile(i)} className="p-0.5 rounded hover:bg-slate-200 text-slate-500">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {files.length > 0 && (
                                        <Button type="button" variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setFiles([])}>
                                            Clear all
                                        </Button>
                                    )}
                                </div>

                                {/* Customer Signature */}
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <PenLine className="h-4 w-4 text-indigo-500" />
                                        Customer Signature {!signature && <span className="text-xs text-slate-400 font-normal">(Optional)</span>}
                                    </label>
                                    {signature ? (
                                        <div className="space-y-2">
                                            <div className="border-2 border-green-300 bg-green-50 rounded-lg p-2 flex items-center justify-center">
                                                <img src={signature} alt="Customer signature" className="max-h-[100px]" />
                                            </div>
                                            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSignature(null)}>
                                                Clear & Re-sign
                                            </Button>
                                        </div>
                                    ) : (
                                        <SignaturePad onSave={setSignature} />
                                    )}
                                </div>
                            </div>

                            {/* Dual-Action Footer */}
                            <DialogFooter className="flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                                <Button
                                    onClick={handleConfirmAndGenerate}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base font-bold"
                                >
                                    {loading ? "Generating..." : "Confirm & Generate Invoice"}
                                </Button>
                                <Button
                                    onClick={handleSaveForLater}
                                    disabled={loading}
                                    variant="outline"
                                    className="w-full h-10 border-slate-300"
                                >
                                    {loading ? "Saving..." : "Save for Later"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => onOpenChange(false)}
                                    disabled={loading}
                                    className="w-full text-slate-500"
                                >
                                    Cancel
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
