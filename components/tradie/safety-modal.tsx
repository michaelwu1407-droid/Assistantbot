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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { completeSafetyCheck } from "@/actions/job-actions";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface SafetyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    dealId: string;
}

export function SafetyModal({ open, onOpenChange, onConfirm, dealId }: SafetyModalProps) {
    const [checks, setChecks] = useState({
        siteSafe: false,
        powerOff: false,
        ppeWorn: false,
    });
    const [loading, setLoading] = useState(false);

    const allChecked = checks.siteSafe && checks.powerOff && checks.ppeWorn;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const result = await completeSafetyCheck(dealId, checks);
            if (result.success) {
                toast.success("Safety check logged");
                onConfirm();
            } else {
                toast.error("Failed to log safety check");
            }
        } catch (error) {
            toast.error("Error logging safety check");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto bg-amber-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <DialogTitle className="text-center">Safety Check Required</DialogTitle>
                    <DialogDescription className="text-center">
                        You must confirm the site is safe before starting work.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-neutral-50 cursor-pointer" onClick={() => setChecks(c => ({ ...c, siteSafe: !c.siteSafe }))}>
                        <Checkbox id="siteSafe" checked={checks.siteSafe} onCheckedChange={(c: boolean | "indeterminate") => setChecks(prev => ({ ...prev, siteSafe: c === true }))} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="siteSafe" className="font-semibold cursor-pointer">Site Area Clear</Label>
                            <span className="text-sm text-muted-foreground">No hazards or obstructions</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-neutral-50 cursor-pointer" onClick={() => setChecks(c => ({ ...c, powerOff: !c.powerOff }))}>
                        <Checkbox id="powerOff" checked={checks.powerOff} onCheckedChange={(c: boolean | "indeterminate") => setChecks(prev => ({ ...prev, powerOff: c === true }))} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="powerOff" className="font-semibold cursor-pointer">Power/Water Isolated</Label>
                            <span className="text-sm text-muted-foreground">Services turned off if required</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-neutral-50 cursor-pointer" onClick={() => setChecks(c => ({ ...c, ppeWorn: !c.ppeWorn }))}>
                        <Checkbox id="ppeWorn" checked={checks.ppeWorn} onCheckedChange={(c: boolean | "indeterminate") => setChecks(prev => ({ ...prev, ppeWorn: c === true }))} />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="ppeWorn" className="font-semibold cursor-pointer">PPE Equipped</Label>
                            <span className="text-sm text-muted-foreground">Boots, glasses, and gear ready</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!allChecked || loading}
                        className="bg-neutral-900 text-white hover:bg-neutral-800 w-full sm:w-auto"
                    >
                        Confirm & Start Work
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
