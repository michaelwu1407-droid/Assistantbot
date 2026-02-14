"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation, MapPin, HardHat, CheckCircle2 } from "lucide-react";
import { updateJobStatus, sendOnMyWaySMS } from "@/actions/tradie-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SafetyModal } from "./safety-modal";
import { JobCompletionModal } from "./job-completion-modal";
import { cn } from "@/lib/utils";

type JobStatus = "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED" | "CANCELLED";

interface JobStatusBarProps {
    dealId: string;
    currentStatus: JobStatus;
    contactName: string;
    safetyCheckCompleted: boolean;
}

export function JobStatusBar({ dealId, currentStatus, contactName, safetyCheckCompleted }: JobStatusBarProps) {
    const [status, setStatus] = useState<JobStatus>(currentStatus);
    const [loading, setLoading] = useState(false);
    const [safetyModalOpen, setSafetyModalOpen] = useState(false);
    const [completionModalOpen, setCompletionModalOpen] = useState(false);
    const router = useRouter();

    const handleStatusChange = async (newStatus: JobStatus) => {
        setLoading(true);
        try {
            const result = await updateJobStatus(dealId, newStatus);
            if (result.success) {
                setStatus(newStatus);
                toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
                if (newStatus === "TRAVELING") {
                    // Send actual SMS
                    const smsResult = await sendOnMyWaySMS(dealId);
                    if (smsResult.success) {
                        toast.success(`SMS sent to ${contactName}: "On my way!"`);
                    } else {
                        toast.error(`Failed to send SMS: ${smsResult.error}`);
                    }
                }
                router.refresh();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleStartWork = () => {
        // If they are arriving, we switch to ON_SITE
        handleStatusChange("ON_SITE");
    };

    const onSafetyCheckComplete = () => {
        setSafetyModalOpen(false);
        router.refresh(); // Refresh to update the safetyCheckCompleted prop from server
    };

    if (status === "COMPLETED" || status === "CANCELLED") {
        return null; // Don't show footer for completed jobs
    }

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950 p-4 pb-8 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
                <div className="max-w-md mx-auto w-full">
                    {status === "SCHEDULED" && (
                        <Button
                            onClick={() => handleStatusChange("TRAVELING")}
                            disabled={loading}
                            className="w-full h-16 text-xl font-black uppercase tracking-widest bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Navigation className="mr-3 h-6 w-6" />}
                            START TRAVEL
                        </Button>
                    )}

                    {status === "TRAVELING" && (
                        <Button
                            onClick={handleStartWork}
                            disabled={loading}
                            className="w-full h-16 text-xl font-black uppercase tracking-widest bg-[#ccff00] hover:bg-[#b3e600] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)] transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <MapPin className="mr-3 h-6 w-6" />}
                            I'VE ARRIVED
                        </Button>
                    )}

                    {status === "ON_SITE" && !safetyCheckCompleted && (
                        <Button
                            onClick={() => setSafetyModalOpen(true)}
                            disabled={loading}
                            className="w-full h-16 text-xl font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95"
                        >
                            <HardHat className="mr-3 h-6 w-6" />
                            SAFETY CHECK
                        </Button>
                    )}

                    {status === "ON_SITE" && safetyCheckCompleted && (
                        <Button
                            onClick={() => setCompletionModalOpen(true)}
                            disabled={loading}
                            className="w-full h-16 text-xl font-black uppercase tracking-widest bg-white hover:bg-slate-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-95"
                        >
                            <CheckCircle2 className="mr-3 h-6 w-6" />
                            COMPLETE JOB
                        </Button>
                    )}
                </div>
            </div>

            <SafetyModal
                open={safetyModalOpen}
                onOpenChange={setSafetyModalOpen}
                onConfirm={onSafetyCheckComplete}
                dealId={dealId}
            />

            <JobCompletionModal
                open={completionModalOpen}
                onOpenChange={setCompletionModalOpen}
                dealId={dealId}
                onSuccess={() => {
                    setStatus("COMPLETED");
                    router.refresh();
                }}
            />
        </>
    );
}
