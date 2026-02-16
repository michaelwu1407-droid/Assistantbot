import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import MapView from "@/components/map/map-view-client"

export const dynamic = "force-dynamic"

export default async function TradieMapPage() {
    try {
        const userId = await getAuthUserId()
        
        if (!userId) {
            throw new Error("User not authenticated");
        }
        
        const workspace = await getOrCreateWorkspace(userId)
        const jobs = await getTradieJobs(workspace.id)

        return (
            <div className="h-[calc(100vh-4rem)] w-full">
                <MapView jobs={jobs} />
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
