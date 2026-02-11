"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GripVertical, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useIndustry } from "@/components/providers/industry-provider";

export interface SchedulerJob {
    id: string;
    title: string;
    clientName: string;
    duration: number; // in hours
    color: string;
    scheduledAt?: string | null; // Use string for ISO dates (safe for serialization)
    stage?: string;
    status?: string;
}

interface DraggableJobCardProps {
    job: SchedulerJob;
    isOverlay?: boolean;
}

export function DraggableJobCard({ job, isOverlay }: DraggableJobCardProps) {
    const router = useRouter();
    const { industry } = useIndustry();

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: job.id,
        data: {
            type: "Job",
            job,
        },
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    const handleClick = () => {
        if (isDragging) return; // Prevent navigation if dragging just finished (though dnd-kit usually handles this via activationConstraint)

        if (industry === "TRADES") {
            router.push(`/dashboard/tradie/jobs/${job.id}`);
        } else {
            router.push(`/dashboard/deals/${job.id}`);
        }
    };

    // Determine status color and icon
    const getStatusConfig = (status?: string) => {
        switch (status) {
            case 'COMPLETED':
            case 'WON':
                return {
                    borderColor: 'border-l-green-500',
                    bgColor: 'bg-green-50',
                    icon: <CheckCircle2 className="h-3 w-3 text-green-600" />
                };
            case 'IN_PROGRESS':
            case 'ON_SITE':
            case 'TRAVELING':
                return {
                    borderColor: 'border-l-blue-500',
                    bgColor: 'bg-blue-50',
                    icon: <Clock className="h-3 w-3 text-blue-600" />
                };
            case 'CANCELLED':
            case 'LOST':
                return {
                    borderColor: 'border-l-red-500',
                    bgColor: 'bg-red-50',
                    icon: <AlertCircle className="h-3 w-3 text-red-600" />
                };
            default: // SCHEDULED, PENDING, etc.
                return {
                    borderColor: 'border-l-slate-400',
                    bgColor: 'bg-white',
                    icon: <Clock className="h-3 w-3 text-slate-400" />
                };
        }
    };

    const config = getStatusConfig(job.status || job.stage);

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={handleClick}
            className={cn(
                "cursor-move hover:shadow-md transition-all mb-2 border-l-4 h-full",
                config.borderColor,
                config.bgColor,
                isDragging && "opacity-50",
                isOverlay && "shadow-xl opacity-90 scale-105 rotate-2 cursor-grabbing z-50",
            )}
        >
            <CardContent className="p-2 flex items-start gap-1.5">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-semibold text-xs truncate leading-tight">{job.title}</h4>
                        {config.icon}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mb-1">{job.clientName}</p>

                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-slate-300 bg-white/50">
                            {job.duration}h
                        </Badge>
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            {job.status || job.stage}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
