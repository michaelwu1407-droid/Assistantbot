import { getNextJob, getTodaySchedule, getTradieJobs } from "@/actions/tradie-actions"
import { getFinancialStats } from "@/actions/dashboard-actions"
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function TradiePage() {
    const userId = await getAuthUserId()
    
    if (!userId) {
        throw new Error("User not authenticated");
    }
    
    const workspace = await getOrCreateWorkspace(userId)

    const [jobs, nextJob, todayJobs, financialStats] = await Promise.all([
        getTradieJobs(workspace.id),
        getNextJob(workspace.id),
        getTodaySchedule(workspace.id),
        getFinancialStats(workspace.id),
    ])

    const initialJob = nextJob ? {
        id: nextJob.id,
        title: nextJob.title,
        address: nextJob.address || "",
        clientName: nextJob.client,
        status: nextJob.status || "SCHEDULED",
        value: 0, // getNextJob doesn't return value currently
        scheduledAt: nextJob.time ? new Date(nextJob.time) : new Date(),
        description: nextJob.description || "",
        safetyCheckCompleted: nextJob.safetyCheckCompleted,
        contactPhone: "", // Not returned by getNextJob yet
    } as any : jobs[0] ? {
        id: jobs[0].id,
        title: jobs[0].title,
        address: jobs[0].address || "",
        clientName: jobs[0].clientName,
        status: jobs[0].status,
        value: jobs[0].value,
        scheduledAt: jobs[0].scheduledAt,
        description: jobs[0].description || "",
        safetyCheckCompleted: false, // Default if not in list view
        contactPhone: "",
    } as any : undefined

    const user = await db.user.findUnique({ where: { id: userId } })

    return (
        <TradieDashboardClient
            initialJob={initialJob}
            todayJobs={todayJobs}
            userName={user?.name || "Mate"}
            financialStats={financialStats}
        />
    )
}
