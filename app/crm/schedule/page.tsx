import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { ScheduleCalendar } from "./schedule-calendar"
import { db } from "@/lib/db"
import { DEFAULT_WORKSPACE_TIMEZONE, resolveWorkspaceTimezone } from "@/lib/timezone"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
    try {
        actor = await requireCurrentWorkspaceAccess()
    } catch {
        redirect("/login")
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let deals: any[] = [], teamMembers: any[] = []
    let workspaceTimezone = DEFAULT_WORKSPACE_TIMEZONE
    try {
        const [allDeals, members, workspaceConfig] = await Promise.all([
            getDeals(actor.workspaceId),
            db.user.findMany({
                where: { workspaceId: actor.workspaceId },
                select: { id: true, name: true, email: true, role: true }
            }),
            db.workspace?.findUnique?.({
                where: { id: actor.workspaceId },
                select: { workspaceTimezone: true },
            }),
        ])
        workspaceTimezone = resolveWorkspaceTimezone(workspaceConfig?.workspaceTimezone)
        // Deleted jobs should not appear on the schedule
        let filteredDeals = allDeals.filter((d: any) => d.stage !== "deleted")

        // RBAC: Team members should only see their own schedule lane and jobs.
        if (actor.role === "TEAM_MEMBER") {
            filteredDeals = filteredDeals.filter((d: any) => d.assignedToId === actor.id)
            teamMembers = members.filter((m: any) => m.id === actor.id)
        } else {
            teamMembers = members
        }

        deals = filteredDeals
        teamMembers = teamMembers.map((m: any) => ({
            ...m,
            name: m.name || m.email.split('@')[0]
        }))
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
            <div className="flex-1 min-h-0">
                <ScheduleCalendar deals={deals} teamMembers={teamMembers} workspaceTimezone={workspaceTimezone} />
            </div>
        </div>
    )
}
