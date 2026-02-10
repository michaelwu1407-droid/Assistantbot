"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SchedulerJob, DraggableJobCard } from "./draggable-job-card";
import { format, isToday } from "date-fns";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm

interface CalendarGridProps {
    scheduledJobs: Record<string, SchedulerJob[]>; // Key is "yyyy-MM-dd-H"
    visibleDates: Date[];
}

// Droppable Cell Component
function TimeSlot({ id, children, date, hour }: { id: string, children: React.ReactNode, date: Date, hour: number }) {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
        data: { date, hour },
    });

    const isCurrentDay = isToday(date);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "border-r border-b min-h-[80px] p-1 transition-colors relative",
                isOver ? "bg-blue-50" : "bg-white",
                // Highlight today column slightly
                isCurrentDay && !isOver && "bg-blue-50/10"
            )}
        >
            <div className="absolute top-1 right-1 text-[10px] text-slate-300 pointer-events-none select-none">
                {hour}:00
            </div>
            {children}
        </div>
    );
}

export function CalendarGrid({ scheduledJobs, visibleDates }: CalendarGridProps) {
    // Calculate grid columns: 1 for time + number of visible dates
    const gridCols = `grid-cols-${visibleDates.length + 1}`;

    // Dynamic style for grid template columns if Tailwind classes aren't enough
    const gridStyle = {
        gridTemplateColumns: `80px repeat(${visibleDates.length}, minmax(0, 1fr))`
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Row */}
            <div className="grid border-b bg-slate-50 shrink-0" style={gridStyle}>
                <div className="p-3 border-r font-medium text-xs text-center text-muted-foreground flex items-center justify-center">
                    Time
                </div>
                {visibleDates.map(date => (
                    <div key={date.toISOString()} className={cn(
                        "p-3 border-r font-semibold text-sm text-center flex flex-col items-center justify-center",
                        isToday(date) && "bg-blue-50 text-blue-700"
                    )}>
                        <span className="uppercase text-xs text-muted-foreground">{format(date, 'EEE')}</span>
                        <span className="text-lg leading-none">{format(date, 'd')}</span>
                    </div>
                ))}
            </div>

            {/* Scrollable Grid */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid" style={{ ...gridStyle, minWidth: visibleDates.length > 1 ? "800px" : "auto" }}>
                    {/* Time Labels Column */}
                    <div className="flex flex-col">
                        {HOURS.map(hour => (
                            <div key={hour} className="h-[100px] border-b border-r flex items-center justify-center text-xs text-muted-foreground bg-slate-50 font-medium">
                                {hour}:00 {hour < 12 ? 'AM' : 'PM'}
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {visibleDates.map(date => (
                        <div key={date.toISOString()} className="flex flex-col">
                            {HOURS.map(hour => {
                                const dateKey = format(date, 'yyyy-MM-dd');
                                const slotId = `${dateKey}-${hour}`;
                                const jobsInSlot = scheduledJobs[slotId] || [];

                                return (
                                    <TimeSlot key={slotId} id={slotId} date={date} hour={hour}>
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
