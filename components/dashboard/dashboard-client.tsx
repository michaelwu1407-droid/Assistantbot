"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"
import { Header } from "./header"

interface DashboardClientProps {
    workspace: WorkspaceView
    deals: DealView[]
    userName: string
    userId: string
}

export function DashboardClient({ workspace, deals, userName, userId }: DashboardClientProps) {
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full p-2 md:p-3 md:pt-2 gap-2">
                <Header
                    userName={userName}
                    userId={userId}
                    workspaceId={workspace.id}
                    onNewDeal={() => setIsNewDealModalOpen(true)}
                />

                {/* Dashboard Content Grid - Tight gap (12px) */}
                <div className="flex flex-col flex-1 min-h-0 gap-2">

                    {/* Row 1: KPI Cards & Activity Feed - Full width nav to chat, activity 2.5x one card */}
                    <div className="flex w-full gap-4 pb-2 shrink-0 min-h-[100px]">
                        <DashboardKpiCards deals={deals} />
                        {/* Activity Feed - 2.5x width of one KPI card */}
                        <div className="flex-[2.5] min-w-0 h-[100px] max-h-[100px]">
                            <div className="ott-card w-full h-full p-3 flex flex-col bg-white overflow-hidden shadow-sm">
                                <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-2 shrink-0">
                                    Activity
                                </span>
                                <ActivityFeed workspaceId={workspace.id} className="flex-1 min-h-0 overflow-y-auto" compact={true} />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Kanban Board - Full Width (Cols 1-12) */}
                    <div className="xl:col-span-12 flex-1 min-h-0 overflow-hidden flex flex-col pt-1">
                        <div className="h-full w-full overflow-hidden">
                            <KanbanBoard deals={deals} industryType={workspace.industryType} />
                        </div>
                    </div>
                </div>
            </div>

            <NewDealModal
                isOpen={isNewDealModalOpen}
                onClose={() => setIsNewDealModalOpen(false)}
                workspaceId={workspace.id}
            />
        </div>
    )
}
