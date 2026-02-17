import { getAuthUserId } from "@/lib/auth"
import { getTodaySchedule } from "@/actions/tradie-actions"
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function TradiePage() {
    const userId = await getAuthUserId()
    const todayJobs = await getTodaySchedule(userId)

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full">
                <Suspense fallback={<div className="h-full bg-background animate-pulse" />}>
                    <TradieDashboardClient 
                        todayJobs={todayJobs}
                        userName={userId}
                    />
                </Suspense>
            </div>
        </div>
    )
}
