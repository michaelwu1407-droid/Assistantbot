import { getNextJob, getTodaySchedule } from "@/actions/tradie-actions"
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { db } from "@/lib/db"

// Force dynamic since we fetch user-specific data
export const dynamic = "force-dynamic"

export default async function TradiePage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)

    const [nextJob, todayJobs, user] = await Promise.all([
        getNextJob(workspace.id),
        getTodaySchedule(workspace.id),
        db.user.findUnique({ where: { id: userId } })
    ])

    return (
        <TradieDashboardClient
            initialJob={nextJob || undefined}
            todayJobs={todayJobs}
            userName={user?.name || "Mate"}
        // financialStats={...} // TODO: Implement stats fetching
        />
    )
}
