"use client";

import { useState, useMemo, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    closestCenter
} from "@dnd-kit/core";
import { JobSidebar } from "./job-sidebar";
import { CalendarGrid } from "./calendar-grid";
import { DraggableJobCard, SchedulerJob } from "./draggable-job-card";
import { createPortal } from "react-dom";
import {
    format,
    startOfWeek,
    addDays,
    addWeeks,
    isValid
} from "date-fns";
import { ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateJobSchedule } from "@/actions/tradie-actions";
import { toast } from "sonner";

export interface SchedulerViewProps {
    initialJobs?: any[];
}

export default function SchedulerView({ initialJobs = [] }: SchedulerViewProps) {
    const [mounted, setMounted] = useState(false);

    // State for navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [activeJob, setActiveJob] = useState<SchedulerJob | null>(null);

    // Hydration fix
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate visible dates based on view mode
    const visibleDates = useMemo(() => {
        if (viewMode === 'day') {
            return [currentDate];
        }
        // Week view (Monday - Friday)
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 5 }, (_, i) => addDays(start, i));
    }, [currentDate, viewMode]);

    // Transform & Filter Jobs
    // We maintain two lists: Scheduled (on the grid) and Unscheduled (sidebar)

    const { scheduledMap, unscheduledList } = useMemo(() => {
        const sMap: Record<string, SchedulerJob[]> = {};
        const uList: SchedulerJob[] = [];

        initialJobs.forEach((job: any) => {
            const scheduledDate = job.scheduledAt ? new Date(job.scheduledAt) : null;
            const isScheduled = scheduledDate && isValid(scheduledDate);

            const schedulerJob: SchedulerJob = {
                id: job.id,
                title: job.title,
                clientName: job.contact?.name || job.clientName || "Unknown Client",
                duration: 2, // Default duration, ideally from DB
                color: job.stage === 'WON' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-blue-100 border-blue-200 text-blue-800',
                stage: job.stage,
                status: job.status,
                scheduledAt: isScheduled && scheduledDate ? scheduledDate.toISOString() : null
            };

            if (isScheduled && scheduledDate) {
                // Key format: "yyyy-MM-dd-H" (e.g., "2023-10-27-10")
                const key = `${format(scheduledDate, 'yyyy-MM-dd')}-${format(scheduledDate, 'H')}`;
                if (!sMap[key]) sMap[key] = [];
                sMap[key].push(schedulerJob);
            } else if (job.stage !== 'WON' && job.stage !== 'LOST' && job.stage !== 'ARCHIVED') {
                // Only show active deals in sidebar
                uList.push(schedulerJob);
            }
        });

        return { scheduledMap: sMap, unscheduledList: uList };
    }, [initialJobs]);

    // Local state to handle optimistic updates
    const [localScheduled, setLocalScheduled] = useState(scheduledMap);
    const [localUnscheduled, setLocalUnscheduled] = useState(unscheduledList);

    // Sync when props change
    useEffect(() => {
        setLocalScheduled(scheduledMap);
        setLocalUnscheduled(unscheduledList);
    }, [scheduledMap, unscheduledList]);


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
        const dropZoneId = over.id as string;

        // Check if dropping onto a valid time slot
        // ID format: "yyyy-MM-dd-H"
        if (dropZoneId.includes("-") && dropZoneId.split('-').length >= 3) {
            // Parse drop date
            // Note: Our ID is yyyy-MM-dd-H. Split gives [y, m, d, h]
            const parts = dropZoneId.split('-').map(Number);
            if (parts.length < 4) return;

            const [year, month, day, hour] = parts;
            const newDate = new Date(year, month - 1, day, hour);

            if (!isValid(newDate)) return;

            // Optimistic Update
            const newScheduled = { ...localScheduled };

            // 1. Remove from source (sidebar or previous slot)
            if (localUnscheduled.some(j => j.id === job.id)) {
                 setLocalUnscheduled(prev => prev.filter(j => j.id !== job.id));
            } else {
                // Remove from previous scheduled slot
                Object.keys(newScheduled).forEach(key => {
                    newScheduled[key] = newScheduled[key].filter(j => j.id !== job.id);
                });
            }

            // 2. Add to new slot
            if (!newScheduled[dropZoneId]) {
                newScheduled[dropZoneId] = [];
            }

            const updatedJob: SchedulerJob = {
                ...job,
                scheduledAt: newDate.toISOString(),
                status: 'SCHEDULED'
            };

            newScheduled[dropZoneId].push(updatedJob);
            setLocalScheduled(newScheduled);

            toast.success(`Rescheduled to ${format(newDate, 'MMM d, h:mm a')}`);

            // 3. Persist
            try {
                const result = await updateJobSchedule(job.id, newDate);
                if (!result.success) throw new Error(result.error);
            } catch (error) {
                console.error("Failed to update schedule", error);
                toast.error("Failed to save schedule change");
                // Revert state (simplified: refresh page or complex rollback logic)
            }
        }
    };

    // Navigation
    const navigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const delta = direction === 'next' ? 1 : -1;
        if (viewMode === 'day') {
            setCurrentDate(d => addDays(d, delta));
        } else {
            setCurrentDate(d => addWeeks(d, delta));
        }
    };

    if (!mounted) return null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
                {/* Header (UI-6 Style Upgrade) */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>

                        <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
                                onClick={() => navigate('prev')}
                            >
                                <ChevronLeft className="h-4 w-4 text-slate-600" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs font-medium px-3 rounded-sm hover:bg-white hover:shadow-sm"
                                onClick={() => navigate('today')}
                            >
                                Today
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-sm hover:bg-white hover:shadow-sm"
                                onClick={() => navigate('next')}
                            >
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className={`h-8 px-3 text-xs font-medium transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <List className="h-3.5 w-3.5 mr-2" />
                            Day
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className={`h-8 px-3 text-xs font-medium transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-2" />
                            Week
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar: Unscheduled Jobs */}
                    <div className="w-72 flex-shrink-0 h-full border-r border-slate-200 bg-white z-10 flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unscheduled Jobs</h3>
                        </div>
                        <JobSidebar jobs={localUnscheduled} />
                    </div>

                    {/* Main Calendar Grid */}
                    <div className="flex-1 h-full min-w-0 bg-white overflow-hidden flex flex-col">
                        <CalendarGrid
                            scheduledJobs={localScheduled}
                            visibleDates={visibleDates}
                        />
                    </div>
                </div>
            </div>

            {/* Drag Overlay Portal */}
            {mounted && createPortal(
                <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeJob ? (
                        <div className="rotate-3 scale-105 opacity-90 cursor-grabbing">
                             <DraggableJobCard job={activeJob} isOverlay />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
