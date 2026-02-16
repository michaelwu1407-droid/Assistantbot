import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import SchedulerView from "@/components/scheduler/scheduler-view"

export const dynamic = "force-dynamic"

export default async function SchedulerPage() {
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
}
