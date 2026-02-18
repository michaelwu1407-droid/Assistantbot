import { getAuthUserId } from "@/lib/auth"
import { getTodaySchedule, getTradieJobById } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function TradiePage({
    searchParams,
}: {
    searchParams: Promise<{ jobId?: string }>
}) {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const todayJobs = await getTodaySchedule(workspace.id)

    // Await params for Next.js 15+
    const params = await searchParams;

    // Determine initial job:
    // 1. From URL param (jobId) -> check today's list, if not found, fetch specifically
    // 2. Or the first job in the list
    let initialJob = undefined

    if (params?.jobId) {
        initialJob = todayJobs.find(job => job.id === params.jobId)

        if (!initialJob) {
            // Fetch specifically if not in today's list (e.g. future/past job)
            const specificJob = await getTradieJobById(params.jobId)
            if (specificJob) {
                initialJob = specificJob
            }
        }
    }

    if (!initialJob && todayJobs.length > 0) {
        initialJob = todayJobs[0]
    }

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full">
                <Suspense fallback={<div className="h-full bg-background animate-pulse" />}>
                    <TradieDashboardClient
                        todayJobs={todayJobs}
                        initialJob={initialJob}
                        userName={userId}
                    />
                </Suspense>
            </div>
        </div>
    )
}
