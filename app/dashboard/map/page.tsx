import { getTradieJobs, getTodaySchedule } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import MapView from "@/components/map/map-view-client"
import { MapPageClient } from "@/components/map/map-page-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, HardHat } from "lucide-react"

export const dynamic = "force-dynamic"

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
            scheduledAt: j.scheduledAt instanceof Date ? j.scheduledAt : j.scheduledAt ? new Date(j.scheduledAt as unknown as string) : undefined,
        }))

        return (
            <div className="h-full flex flex-col">
                {/* Start the day strip */}
                <div className="shrink-0 flex items-center justify-between gap-4 p-3 border-b border-slate-200 bg-white/80">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-slate-900">
                            {todaySchedule.length > 0
                                ? `${todaySchedule.length} job${todaySchedule.length === 1 ? "" : "s"} today`
                                : "No jobs scheduled for today"}
                        </span>
                    </div>
                    <Button size="sm" asChild>
                        <Link href="/dashboard/tradie" className="gap-1.5">
                            <HardHat className="h-4 w-4" />
                            Start the day
                        </Link>
                    </Button>
                </div>
                <div className="flex-1 min-h-0">
                    <MapPageClient jobs={jobsWithDate} />
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
