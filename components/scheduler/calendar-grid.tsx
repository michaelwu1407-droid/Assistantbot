"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SchedulerJob, DraggableJobCard } from "./draggable-job-card";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface CalendarGridProps {
    scheduledJobs: Record<string, SchedulerJob[]>; // Key is "Day-Hour" e.g., "Mon-10"
}

// Droppable Cell Component
function TimeSlot({ id, children, day, hour }: { id: string, children: React.ReactNode, day: string, hour: number }) {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
        data: { day, hour },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "border-r border-b min-h-[80px] p-1 transition-colors relative",
                isOver ? "bg-blue-50" : "bg-white",
                // Alternate column backgrounds slightly
                ["Mon", "Wed", "Fri"].includes(day) && !isOver && "bg-slate-50/30"
            )}
        >
            <div className="absolute top-1 right-1 text-[10px] text-slate-300 pointer-events-none select-none">
                {hour}:00
            </div>
            {children}
        </div>
    );
}

export function CalendarGrid({ scheduledJobs }: CalendarGridProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-6 border-b bg-slate-50">
                <div className="p-3 border-r font-medium text-xs text-center text-muted-foreground flex items-center justify-center">
                    Time
                </div>
                {DAYS.map(day => (
                    <div key={day} className="p-3 border-r font-semibold text-sm text-center">
                        {day}
                    </div>
                ))}
            </div>

            {/* Scrollable Grid */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-6" style={{ minWidth: "800px" }}>
                    {/* Time Labels Column */}
                    <div className="flex flex-col">
                        {HOURS.map(hour => (
                            <div key={hour} className="h-[100px] border-b border-r flex items-center justify-center text-xs text-muted-foreground bg-slate-50 font-medium">
                                {hour}:00 {hour < 12 ? 'AM' : 'PM'}
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {DAYS.map(day => (
                        <div key={day} className="flex flex-col">
                            {HOURS.map(hour => {
                                const slotId = `${day}-${hour}`;
                                const jobsInSlot = scheduledJobs[slotId] || [];

                                return (
                                    <TimeSlot key={slotId} id={slotId} day={day} hour={hour}>
                                        {jobsInSlot.map(job => (
                                            <DraggableJobCard key={job.id} job={job} />
                                        ))}
                                    </TimeSlot>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
