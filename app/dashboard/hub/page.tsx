import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getDeals } from "@/actions/deal-actions"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { Header } from "@/components/dashboard/header"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export const dynamic = "force-dynamic"

export default async function HubPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const deals = await getDeals(workspace.id)

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full p-2 md:p-3 md:pt-2 gap-2">
                <Header
                    userName={userId}
                    userId={userId}
                    workspaceId={workspace.id}
                    onNewDeal={() => {}}
                />

                {/* Hub Dashboard - Full Width Kanban with Filters */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-[#0F172A]">Pipeline Hub</h1>
                                <p className="text-sm text-muted-foreground">
                                    Central command center for all deals and jobs
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Filters */}
                                <div className="flex items-center gap-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded" />
                                        <span>Stale Only</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="rounded" />
                                        <span>High Value</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        {/* Kanban Board */}
                        <div className="h-full">
                            <Suspense fallback={<DashboardSkeleton />}>
                                <KanbanBoard 
                                    deals={deals} 
                                    industryType={workspace.industryType} 
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>

            <NewDealModal
                isOpen={false}
                onClose={() => {}}
                workspaceId={workspace.id}
            />
        </div>
    )
}
