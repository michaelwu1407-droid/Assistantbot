import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import dynamicImport from "next/dynamic"

export const dynamic = "force-dynamic"

// Dynamically import to avoid SSR issues with Leaflet
const MapView = dynamicImport(() => import("@/components/map/map-view"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">
            Loading Map...
        </div>
    ),
})

export default async function TradieMapPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <MapView jobs={jobs} />
        </div>
    )
}
