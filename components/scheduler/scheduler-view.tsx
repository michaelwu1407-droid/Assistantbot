"use client";

import { useState, useMemo } from "react";
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
import {
    format,
    startOfWeek,
    addDays,
    startOfDay,
    addWeeks,
    subWeeks,
    isSameDay
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateJobSchedule } from "@/actions/tradie-actions";
import { toast } from "sonner";

export interface SchedulerViewProps {
    initialJobs?: any[];
}

export default function SchedulerView({ initialJobs = [] }: SchedulerViewProps) {
    // State for navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

    // Calculate visible dates based on view mode
    const visibleDates = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        if (viewMode === 'day') {
            return [currentDate];
        }
        // Week view (5 days for now, could be 7)
        return Array.from({ length: 5 }, (_, i) => addDays(start, i));
    }, [currentDate, viewMode]);

    // Transform initialJobs to SchedulerJob format
    const transformedJobs: SchedulerJob[] = initialJobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        clientName: job.clientName,
        duration: 2, // Default duration
        color: "", // Handled by component now
        stage: job.status || job.stage, // Ensure stage/status is passed
        status: job.status || job.stage,
        scheduledAt: job.scheduledAt
    }));

    const [unscheduledJobs, setUnscheduledJobs] = useState<SchedulerJob[]>(
        transformedJobs.filter(j => !j.scheduledAt && j.status !== 'COMPLETED' && j.status !== 'CANCELLED')
    );

    // Initialize scheduled jobs map
    // Key format: "yyyy-MM-dd-H"
    const initialScheduled: Record<string, SchedulerJob[]> = {};
    transformedJobs.forEach(job => {
        if (job.scheduledAt) {
            const date = new Date(job.scheduledAt);
            const key = `${format(date, 'yyyy-MM-dd')}-${format(date, 'H')}`;
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
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const job = active.data.current?.job as SchedulerJob;
        setActiveJob(job);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveJob(null);

        if (!over) return;

        const job = active.data.current?.job as SchedulerJob;
        const dropZoneId = over.id as string; // e.g., "2023-10-27-10"

        // Check if dropping onto a time slot
        if (dropZoneId.includes("-") && dropZoneId.split('-').length >= 4) {
            const [year, month, day, hour] = dropZoneId.split('-').map(Number);

            // Construct new date
            const newScheduledAt = new Date(year, month - 1, day, hour);

            // Optimistic Update

            // 1. Remove from unscheduled if it was there
            const wasUnscheduled = unscheduledJobs.some(j => j.id === job.id);
            if (wasUnscheduled) {
                setUnscheduledJobs(prev => prev.filter(j => j.id !== job.id));
            }

            // 2. Remove from previous scheduled slot
            const newScheduled = { ...scheduledJobs };
            Object.keys(newScheduled).forEach(key => {
                newScheduled[key] = newScheduled[key].filter(j => j.id !== job.id);
            });

            // 3. Add to new slot
            if (!newScheduled[dropZoneId]) {
                newScheduled[dropZoneId] = [];
            }

            // Update the job object with new time
            const updatedJob = { ...job, scheduledAt: newScheduledAt, status: job.status === 'NEW' ? 'SCHEDULED' : job.status };
            newScheduled[dropZoneId].push(updatedJob);

            setScheduledJobs(newScheduled);

            // 4. Persist to server
            try {
                const result = await updateJobSchedule(job.id, newScheduledAt);
                if (!result.success) {
                    throw new Error(result.error);
                }
                toast.success("Schedule updated");
            } catch (error) {
                console.error("Failed to update schedule", error);
                toast.error("Failed to update schedule");
                // Rollback (omitted for brevity, but should be done in prod)
            }
        }
    };

    // Navigation Handlers
    const handlePrev = () => {
        if (viewMode === 'day') {
            setCurrentDate(prev => addDays(prev, -1));
        } else {
            setCurrentDate(prev => subWeeks(prev, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            setCurrentDate(prev => addDays(prev, 1));
        } else {
            setCurrentDate(prev => addWeeks(prev, 1));
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full max-h-screen bg-slate-50">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 border">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handlePrev}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs font-medium px-3"
                                onClick={handleToday}
                            >
                                Today
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleNext}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                            {viewMode === 'day'
                                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                                : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                            }
                        </h2>
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className={`h-7 px-3 text-xs font-medium ${viewMode === 'day' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
                        >
                            <List className="h-3.5 w-3.5 mr-1.5" />
                            Day
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className={`h-7 px-3 text-xs font-medium ${viewMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600'}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                            Week
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar (Fixed Width) */}
                    <div className="w-80 flex-shrink-0 h-full border-r bg-white z-10 shadow-sm">
                        <JobSidebar jobs={unscheduledJobs} />
                    </div>

                    {/* Main Calendar Area */}
                    <div className="flex-1 h-full min-w-0 bg-white">
                        <CalendarGrid
                            scheduledJobs={scheduledJobs}
                            visibleDates={visibleDates}
                        />
                    </div>
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
