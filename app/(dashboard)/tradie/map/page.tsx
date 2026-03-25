import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import MapView from "@/components/map/map-view-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function TradieMapPage() {
    const userId = await getAuthUserId()

    if (!userId) {
        redirect("/auth")
    }

    let jobs = null
    let errorMessage: string | null = null

    try {
        const workspace = await getOrCreateWorkspace(userId)
        jobs = await getTradieJobs(workspace.id)
    } catch (error) {
        console.error("Map page error:", error)
        errorMessage = error instanceof Error ? error.message : "Unknown error"
    }

    if (errorMessage || !jobs) {
        return (
            <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Map</h2>
                    <p className="text-slate-600">{errorMessage || "Unknown error"}</p>
                    <p className="text-sm text-slate-500 mt-4">Please try refreshing the page</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <MapView jobs={jobs} />
        </div>
    )
}
