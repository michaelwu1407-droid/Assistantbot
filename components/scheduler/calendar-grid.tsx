"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SchedulerJob, DraggableJobCard } from "./draggable-job-card";
import { format, isToday } from "date-fns";

// Expanded hours for Tradies (6 AM to 8 PM)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);

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
                "border-r border-b min-h-[100px] p-1 transition-colors relative group",
                isOver ? "bg-blue-50" : "bg-white",
                // Highlight today column slightly
                isCurrentDay && !isOver && "bg-blue-50/10"
            )}
        >
            <div className="absolute top-1 right-1 text-[10px] text-slate-300 group-hover:text-slate-400 pointer-events-none select-none transition-colors">
                {hour}:00
            </div>
            {children}
        </div>
    );
}

export function CalendarGrid({ scheduledJobs, visibleDates }: CalendarGridProps) {
    // Dynamic style for grid template columns
    // 60px for time column, then equal fraction for dates
    const gridStyle = {
        gridTemplateColumns: `60px repeat(${visibleDates.length}, minmax(0, 1fr))`
    };

    const minWidth = visibleDates.length > 1 ? "800px" : "auto";

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border rounded-lg shadow-sm">
            {/* Single Scrollable Container for Syncing Header & Body */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="grid" style={{ ...gridStyle, minWidth }}>

                    {/* Sticky Header Row */}
                    <div className="contents sticky top-0 z-20 bg-white shadow-sm">
                         {/* Time Header Corner */}
                        <div className="sticky top-0 left-0 z-30 bg-slate-50 p-3 border-b border-r font-medium text-xs text-center text-muted-foreground flex items-center justify-center h-[60px]">
                            Time
                        </div>

                        {/* Date Headers */}
                        {visibleDates.map(date => (
                            <div key={`header-${date.toISOString()}`} className={cn(
                                "sticky top-0 z-20 h-[60px] p-2 border-b border-r font-semibold text-sm text-center flex flex-col items-center justify-center bg-slate-50 backdrop-blur-sm",
                                isToday(date) && "bg-blue-50 text-blue-700"
                            )}>
                                <span className="uppercase text-[10px] text-muted-foreground tracking-wider">{format(date, 'EEE')}</span>
                                <span className="text-xl leading-none font-bold mt-0.5">{format(date, 'd')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    {/* Time Labels Column (Sticky Left) */}
                    <div className="contents">
                         {/* We render the time labels along with the slots in the main loop to keep grid structure simple
                             BUT grid-auto-flow is row by default. We need a column for times.
                             Let's use the standard approach:
                             First column is times. Subsequent columns are days.
                         */}

                         {/* Actually, with CSS Grid, we can just iterate rows.
                             For each HOUR, we render the Time Label, then the Slot for each Date.
                          */}
                         {HOURS.map(hour => (
                            <div key={`row-${hour}`} className="contents">
                                {/* Time Label */}
                                <div className="sticky left-0 z-10 bg-white border-b border-r flex items-center justify-center text-xs text-muted-foreground font-medium p-2">
                                    {hour <= 12 ? hour : hour - 12} {hour < 12 ? 'AM' : 'PM'}
                                </div>

                                {/* Slots for this hour across all dates */}
                                {visibleDates.map(date => {
                                    const dateKey = format(date, 'yyyy-MM-dd');
                                    const slotId = `${dateKey}-${hour}`;
                                    const jobsInSlot = scheduledJobs[slotId] || [];

                                    return (
                                        <TimeSlot key={slotId} id={slotId} date={date} hour={hour}>
                                            <div className="flex flex-col gap-2">
                                                {jobsInSlot.map(job => (
                                                    <DraggableJobCard key={job.id} job={job} />
                                                ))}
                                            </div>
                                        </TimeSlot>
                                    );
                                })}
                            </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
