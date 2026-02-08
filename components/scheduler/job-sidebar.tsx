"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { DraggableJobCard, SchedulerJob } from "./draggable-job-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobSidebarProps {
    jobs: SchedulerJob[];
}

export function JobSidebar({ jobs }: JobSidebarProps) {
    return (
        <Card className="h-full border-r rounded-none flex flex-col bg-slate-50/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                    Unscheduled Jobs ({jobs.length})
                </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="p-3 pt-0">
                    {jobs.length === 0 ? (
                        <div className="text-center p-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                            No unscheduled jobs
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <DraggableJobCard key={job.id} job={job} />
                        ))
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    );
}
