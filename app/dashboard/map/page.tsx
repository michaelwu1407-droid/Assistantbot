import { getTradieJobs, getTodaySchedule } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { MapPageClient } from "@/components/map/map-page-client"
import { Calendar } from "lucide-react"

export const dynamic = "force-dynamic"

// Fake jobs for today (Sydney area) so you can test the map and list when there are no real jobs
function getFakeJobsForToday(): Array<{ id: string; title: string; clientName: string; address: string; status: string; value: number; scheduledAt: Date; lat: number; lng: number }> {
    const today = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return [
        { id: "fake-map-1", title: "Tap repair", clientName: "Jane Smith", address: "42 George St, Sydney NSW 2000", status: "SCHEDULED", value: 180, scheduledAt: new Date(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T09:00:00`), lat: -33.8688, lng: 151.2093 },
        { id: "fake-map-2", title: "Hot water check", clientName: "Mike Jones", address: "15 Pitt St, Sydney NSW 2000", status: "SCHEDULED", value: 220, scheduledAt: new Date(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T11:30:00`), lat: -33.8676, lng: 151.2074 },
        { id: "fake-map-3", title: "Drain clear", clientName: "Sarah Brown", address: "88 Elizabeth St, Sydney NSW 2000", status: "SCHEDULED", value: 350, scheduledAt: new Date(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T14:00:00`), lat: -33.8715, lng: 151.2107 },
    ]
}

export default async function DashboardMapPage() {
    try {
        const userId = await getAuthUserId()
        if (!userId) throw new Error("User not authenticated")

        const workspace = await getOrCreateWorkspace(userId)
        const [jobs, todaySchedule] = await Promise.all([
            getTradieJobs(workspace.id),
            getTodaySchedule(workspace.id),
        ])

        const jobsWithDate = jobs.map((j) => ({
            ...j,
            value: Number(j.value) || 0,
            scheduledAt: j.scheduledAt instanceof Date ? j.scheduledAt : j.scheduledAt ? new Date(j.scheduledAt as unknown as string) : new Date(),
        }))

        // If fewer than 2 jobs today, add fake jobs so you can test the map and list
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)
        const isToday = (j: { scheduledAt: Date }) => {
            const d = j.scheduledAt ? new Date(j.scheduledAt) : null
            return d && d >= todayStart && d <= todayEnd
        }
        const realTodayCount = jobsWithDate.filter(isToday).length
        const displayJobs = realTodayCount >= 2 ? jobsWithDate : [...jobsWithDate, ...getFakeJobsForToday()]
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
