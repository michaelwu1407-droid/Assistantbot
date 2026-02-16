import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import SchedulerView from "@/components/scheduler/scheduler-view"

export const dynamic = "force-dynamic"

export default async function SchedulerPage() {
    try {
        const userId = await getAuthUserId()
        
        if (!userId) {
            throw new Error("User not authenticated");
        }
        
        const workspace = await getOrCreateWorkspace(userId)
        const jobs = await getTradieJobs(workspace.id)

        return (
            <div className="h-[calc(100vh-4rem)]">
                <SchedulerView initialJobs={jobs} />
            </div>
        )
    } catch (error) {
        console.error("Schedule page error:", error)
        return (
            <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Schedule</h2>
                    <p className="text-slate-400">{(error as Error).message}</p>
                </div>
            </div>
        )
    }
}
