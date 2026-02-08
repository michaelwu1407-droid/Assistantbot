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

// Mock Data
const INITIAL_UNSCHEDULED: SchedulerJob[] = [
    { id: "job-1", title: "Leaky Faucet Repair", clientName: "Alice Smith", duration: 1, color: "border-blue-500" },
    { id: "job-2", title: "Switchboard Upgrade", clientName: "Bob Jones", duration: 3, color: "border-amber-500" },
    { id: "job-3", title: "Garden Lighting", clientName: "Charlie Day", duration: 2, color: "border-green-500" },
    { id: "job-4", title: "Smoke Alarm Check", clientName: "Dana White", duration: 1, color: "border-red-500" },
    { id: "job-5", title: "CCTV Installation", clientName: "Evan Peters", duration: 4, color: "border-purple-500" },
];

export default function SchedulerView() {
    const [unscheduledJobs, setUnscheduledJobs] = useState<SchedulerJob[]>(INITIAL_UNSCHEDULED);
    const [scheduledJobs, setScheduledJobs] = useState<Record<string, SchedulerJob[]>>({});
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
