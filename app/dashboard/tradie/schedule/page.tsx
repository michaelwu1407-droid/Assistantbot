import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getTradieJobs } from "@/actions/tradie-actions"
import SchedulerView from "@/components/scheduler/scheduler-view"

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    return (
        <div className="h-full flex flex-col">
            <SchedulerView initialJobs={jobs} />
        </div>
    )
}
