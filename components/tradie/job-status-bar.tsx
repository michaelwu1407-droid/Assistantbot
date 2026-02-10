"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, HardHat, CheckCircle, Smartphone } from "lucide-react";
import { updateJobStatus } from "@/actions/job-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SafetyModal } from "./safety-modal";
import { JobCompletionModal } from "./job-completion-modal";

type JobStatus = "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED" | "CANCELLED";

interface JobStatusBarProps {
    dealId: string;
    currentStatus: JobStatus;
    contactName: string;
}

export function JobStatusBar({ dealId, currentStatus, contactName }: JobStatusBarProps) {
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
                toast.success(`Status updated to ${newStatus}`);
                if (newStatus === "TRAVELING") {
                    toast.success(`SMS sent to ${contactName}: "On my way!"`);
                }
                router.refresh();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleStartWork = () => {
        setSafetyModalOpen(true);
    };

    const onSafetyCheckComplete = () => {
        setSafetyModalOpen(false);
        handleStatusChange("ON_SITE");
    };

    if (status === "COMPLETED") {
        return (
            <Card className="fixed bottom-0 left-0 right-0 p-4 border-t bg-green-50 z-10 flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="font-semibold text-green-800">Job Completed</span>
            </Card>
        );
    }

    return (
        <>
            <Card className="fixed bottom-4 left-4 right-4 p-4 border bg-neutral-900 text-white z-10 shadow-xl safe-area-pb">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-neutral-400 uppercase tracking-wider">Current Status</span>
                        <span className="font-bold text-lg flex items-center gap-2">
                            {status === "SCHEDULED" && <><MapPin className="h-4 w-4" /> Ready to Go</>}
                            {status === "TRAVELING" && <><Navigation className="h-4 w-4 animate-pulse" /> Traveling</>}
                            {status === "ON_SITE" && <><HardHat className="h-4 w-4" /> On Site</>}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {status === "SCHEDULED" && (
                            <Button
                                onClick={() => handleStatusChange("TRAVELING")}
                                disabled={loading}
                                className="bg-green-500 hover:bg-green-600 text-black font-bold"
                                size="lg"
                            >
                                <Navigation className="mr-2 h-4 w-4" />
                                Start Travel
                            </Button>
                        )}

                        {status === "TRAVELING" && (
                            <Button
                                onClick={handleStartWork}
                                disabled={loading}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
                                size="lg"
                            >
                                <HardHat className="mr-2 h-4 w-4" />
                                Arrived / Start Work
                            </Button>
                        )}

                        {status === "ON_SITE" && (
                            <Button
                                variant="outline"
                                className="text-black bg-white"
                                onClick={() => setCompletionModalOpen(true)}
                            >
                                Complete Job
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

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
                onSuccess={() => setStatus("COMPLETED")}
            />
        </>
    );
}
