import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { MapPageClient } from "@/components/map/map-page-client"
import { Calendar } from "lucide-react"

export const dynamic = "force-dynamic"

/** Map a deal from the kanban (getDeals) to the map Job shape so the map matches the board. */
function dealToMapJob(deal: { id: string; title: string; contactName: string; address?: string | null; stage: string; value: number; scheduledAt?: Date | null; latitude?: number | null; longitude?: number | null }) {
    const scheduledAt = deal.scheduledAt ? new Date(deal.scheduledAt) : new Date()
    return {
        id: deal.id,
        title: deal.title,
        clientName: deal.contactName,
        address: deal.address || "No address",
        status: deal.stage,
        value: Number(deal.value) || 0,
        scheduledAt,
        lat: deal.latitude ?? undefined,
        lng: deal.longitude ?? undefined,
    }
}

export default async function DashboardMapPage() {
    try {
        const userId = await getAuthUserId()
        if (!userId) throw new Error("User not authenticated")

        const workspace = await getOrCreateWorkspace(userId)
        // Server-side filtering: only fetch scheduled, non-deleted deals
        const scheduledDeals = await getDeals(workspace.id, undefined, {
            excludeStages: ["DELETED"],
            requireScheduled: true,
        })
        const displayJobs = scheduledDeals.map(dealToMapJob)

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)
        const isToday = (j: { scheduledAt: Date }) => {
            const d = j.scheduledAt ? new Date(j.scheduledAt) : null
            return d && d >= todayStart && d <= todayEnd
        }
        const todayCount = displayJobs.filter(isToday).length

        return (
            <div className="h-full flex flex-col">
                {/* Today's Jobs strip */}
                <div className="shrink-0 flex items-center gap-4 p-3 border-b border-slate-200 bg-white/80">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-slate-900">
                            {todayCount > 0 ? `${todayCount} job${todayCount === 1 ? "" : "s"} today` : "No jobs scheduled for today"}
                        </span>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <MapPageClient jobs={displayJobs} />
                </div>
            </div>
        )
    } catch (error) {
        console.error("Map page error:", error)
        return (
            <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Map</h2>
                    <p className="text-slate-600">{(error as Error).message}</p>
                    <p className="text-sm text-slate-500 mt-4">Please try refreshing the page</p>
                </div>
            </div>
        )
    }
}
