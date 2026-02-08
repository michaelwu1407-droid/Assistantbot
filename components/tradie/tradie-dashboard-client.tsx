"use client"

import { Header } from "@/components/dashboard/header"
import { JobBottomSheet } from "@/components/tradie/job-bottom-sheet"
import { PulseWidget } from "@/components/dashboard/pulse-widget"
import JobMap from "./job-map"

interface TradieDashboardClientProps {
    initialJob?: {
        id: string;
        title: string;
        address?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    }
    userName: string
}

export function TradieDashboardClient({ initialJob, userName }: TradieDashboardClientProps) {
    return (
        <div className="h-full flex flex-col relative">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                    <Header 
                        userName={userName} 
                        userId="demo-user" 
                        onNewDeal={() => {}} 
                    />
                </div>
            </div>

            {/* Map Layer */}
            <div className="absolute inset-0 bg-slate-900">
                <JobMap deals={initialJob ? [initialJob] : []} />
            </div>

            <PulseWidget mode="tradie" />
            <JobBottomSheet workspaceId="demo-workspace" />
        </div>
    )
}
