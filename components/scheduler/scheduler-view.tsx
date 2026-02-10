"use client";

import { useState } from "react";
import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor
} from "@dnd-kit/core";
import { JobSidebar } from "./job-sidebar";
import { CalendarGrid } from "./calendar-grid";
import { DraggableJobCard, SchedulerJob } from "./draggable-job-card";
import { createPortal } from "react-dom";

import { format } from "date-fns";

// ... imports ...

// ... imports ...

export interface SchedulerViewProps {
    initialJobs?: any[];
}

export default function SchedulerView({ initialJobs = [] }: SchedulerViewProps) {
    // Transform initialJobs to SchedulerJob format
    const transformedJobs: SchedulerJob[] = initialJobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        clientName: job.clientName,
        duration: 2, // Default duration as it's not in the simple job model yet
        color: job.status === 'COMPLETED' ? 'border-green-500' : 'border-blue-500',
        stage: job.status,
        scheduledAt: job.scheduledAt
    }));

    const [unscheduledJobs, setUnscheduledJobs] = useState<SchedulerJob[]>(
        transformedJobs.filter(j => !j.scheduledAt && j.stage !== 'COMPLETED')
    );

    // Initialize scheduled jobs map
    const initialScheduled: Record<string, SchedulerJob[]> = {};
    transformedJobs.forEach(job => {
        if (job.scheduledAt) {
            const date = new Date(job.scheduledAt);
            const key = `${format(date, 'eee')}-${format(date, 'H')}`; // e.g. "Mon-10"
            if (!initialScheduled[key]) {
                initialScheduled[key] = [];
            }
            initialScheduled[key].push(job);
        }
    });

    const [scheduledJobs, setScheduledJobs] = useState<Record<string, SchedulerJob[]>>(initialScheduled);
    const [activeJob, setActiveJob] = useState<SchedulerJob | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor) // Better mobile support
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const job = active.data.current?.job as SchedulerJob;
        setActiveJob(job);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveJob(null);

        if (!over) return;

        const job = active.data.current?.job as SchedulerJob;
        const dropZoneId = over.id as string; // e.g., "Mon-10" or "sidebar" (if we made sidebar droppable later)

        // Check if dropping onto a time slot (contains "-")
        if (dropZoneId.includes("-")) {
            // Remove from unscheduled if it was there
            setUnscheduledJobs(prev => prev.filter(j => j.id !== job.id));

            // Remove from previous scheduled slot if it was there
            const newScheduled = { ...scheduledJobs };

            // Stupid simple removal: scan all slots (inefficient but fine for mock)
            Object.keys(newScheduled).forEach(key => {
                newScheduled[key] = newScheduled[key].filter(j => j.id !== job.id);
            });

            // Add to new slot
            if (!newScheduled[dropZoneId]) {
                newScheduled[dropZoneId] = [];
            }
            newScheduled[dropZoneId].push(job);

            setScheduledJobs(newScheduled);
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full max-h-screen overflow-hidden bg-white">
                {/* Sidebar (Fixed Width) */}
                <div className="w-80 flex-shrink-0 h-full">
                    <JobSidebar jobs={unscheduledJobs} />
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 h-full min-w-0">
                    <CalendarGrid scheduledJobs={scheduledJobs} />
                </div>
            </div>

            {/* Drag Overlay for visual feedback */}
            {createPortal(
                <DragOverlay>
                    {activeJob ? <DraggableJobCard job={activeJob} isOverlay /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
