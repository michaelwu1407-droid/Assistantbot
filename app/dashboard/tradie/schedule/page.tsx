import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getTradieJobs } from "@/actions/tradie-actions"
import SchedulerView from "@/components/scheduler/scheduler-view"

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    // Ensure jobs are correctly formatted dates for client component
    const safeJobs = jobs.map((job: any) => ({
        ...job,
        scheduledAt: job.scheduledAt ? job.scheduledAt.toISOString() : null,
        createdAt: job.createdAt ? job.createdAt.toISOString() : null,
        updatedAt: job.updatedAt ? job.updatedAt.toISOString() : null,
    }))

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <SchedulerView initialJobs={safeJobs} />
        </div>
    )
}
