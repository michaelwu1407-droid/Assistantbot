import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import SchedulerView from "@/components/scheduler/scheduler-view"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SchedulerPage() {
    const userId = await getAuthUserId()

    if (!userId) {
        redirect("/auth")
    }

    let jobs = null
    let errorMessage: string | null = null

    try {
        const workspace = await getOrCreateWorkspace(userId)
        jobs = await getTradieJobs(workspace.id)
    } catch (error) {
        console.error("Schedule page error:", error)
        errorMessage = error instanceof Error ? error.message : "Unknown error"
    }

    if (errorMessage || !jobs) {
        return (
            <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Schedule</h2>
                    <p className="text-slate-400">{errorMessage || "Unknown error"}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-4rem)]">
            <SchedulerView initialJobs={jobs} />
        </div>
    )
}
