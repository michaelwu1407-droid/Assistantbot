"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export interface SchedulerJob {
    id: string;
    title: string;
    clientName: string;
    duration: number; // in hours
    color: string;
    scheduledAt?: Date;
    stage?: string;
}

interface DraggableJobCardProps {
    job: SchedulerJob;
    isOverlay?: boolean;
}

export function DraggableJobCard({ job, isOverlay }: DraggableJobCardProps) {
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

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "cursor-move hover:shadow-md transition-shadow mb-2 border-l-4",
                isDragging && "opacity-50",
                isOverlay && "shadow-xl opacity-90 scale-105 rotate-2 cursor-grabbing",
                job.color
            )}
        >
            <CardContent className="p-3 flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{job.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{job.clientName}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                            {job.duration}h
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
