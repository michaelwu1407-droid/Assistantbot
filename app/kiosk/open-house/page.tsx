import { KioskForm } from "@/components/agent/kiosk-form"
import { getDeals } from "@/actions/deal-actions"

export const dynamic = 'force-dynamic'

// In a real app, this ID would come from a query param ?dealId=...
// or the agent would select the "Active Open House" deal from a dashboard.
// For now, we'll try to find a relevant deal or mock it.
const WORKSPACE_ID = "demo-workspace"

interface PageProps {
    searchParams: Promise<{ dealId?: string }>
}

export default async function OpenHouseKioskPage({ searchParams }: PageProps) {
    const params = await searchParams
    let dealId = params.dealId
    let dealTitle = "123 Main Street"

    // Fallback: Grab the first available deal if none specified (for demo purposes)
    if (!dealId) {
        const deals = await getDeals(WORKSPACE_ID)
        const firstDeal = deals[0]
        if (firstDeal) {
            dealId = firstDeal.id
            dealTitle = firstDeal.title
        }
    }

    if (!dealId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <p className="text-slate-500">No active open house found.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center p-4 md:p-8 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2073&q=80')] bg-cover bg-center relative">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-0"></div>

            <div className="relative z-10 w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
                <div className="hidden lg:block text-white space-y-6">
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-sm font-medium">
                        Open House Now
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight leading-tight">
                        Find your<br />dream home.
                    </h1>
                    <p className="text-lg text-white/80 max-w-md">
                        Sign in to get instant access to property details, floor plans, and upcoming inspection times.
                    </p>

                    <div className="pt-8 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-200"></div>
                            ))}
                        </div>
                        <p className="text-sm font-medium">Join 24 others interested today</p>
                    </div>
                </div>

                <div className="w-full">
                    <KioskForm dealId={dealId} dealTitle={dealTitle} />
                </div>
            </div>

            <div className="absolute bottom-6 left-6 text-white/40 text-xs z-10">
                Powered by Pj Buddy
            </div>
        </div>
    )
}
