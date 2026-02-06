import { getDeals } from "@/actions/deal-actions"
import { Button } from "@/components/ui/button"
import { List, Map as MapIcon } from "lucide-react"
import Link from "next/link"

// Dynamically import Leaflet map to avoid window is not defined during build/SSR
// const JobMap = nextDynamic(() => import("@/components/tradie/job-map"), {
//     ssr: false,
//     loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">Loading Map...</div>
// })

export const dynamic = 'force-dynamic'

export default async function TradieMapPage() {
    const _deals = await getDeals("demo-workspace")

    return (
        <div className="h-full flex flex-col p-6 gap-6">
            <header className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Job Map</h1>
                    <p className="text-sm text-slate-500">Visualize active jobs and plan your route.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <Link href="/dashboard/tradie">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500">
                            <List className="w-4 h-4 mr-2" />
                            List
                        </Button>
                    </Link>
                    <Button variant="secondary" size="sm" className="h-8 px-2 font-medium bg-slate-100 text-slate-900 cursor-default">
                        <MapIcon className="w-4 h-4 mr-2" />
                        Map
                    </Button>
                </div>
            </header>

            <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
                {/* <JobMap deals={deals} /> */}
                <p className="text-slate-400">Map unavailable during build maintenance.</p>
            </div>
        </div>
    )
}
