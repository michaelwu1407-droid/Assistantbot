import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUser } from "@/lib/auth"
import { getDeals } from "@/actions/deal-actions"
import { ScheduleCalendar } from "./schedule-calendar"
import { getCurrentUserRole } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    let deals
    try {
        const workspace = await getOrCreateWorkspace(authUser.id)
        const allDeals = await getDeals(workspace.id)
        // Deleted jobs should not appear on the schedule
        let filteredDeals = allDeals.filter((d) => d.stage !== "deleted")

        // RBAC: Team members only see jobs assigned to them
        const role = await getCurrentUserRole()
        if (role === "TEAM_MEMBER") {
            filteredDeals = filteredDeals.filter((d) => d.assignedToId === authUser.id)
        }

        deals = filteredDeals
    } catch {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">Could not load schedule. Please try again later.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            <h1 className="text-xl font-bold text-midnight mb-3 shrink-0">Schedule</h1>
            <div className="flex-1 min-h-0">
                <ScheduleCalendar deals={deals} />
            </div>
        </div>
    )
}
