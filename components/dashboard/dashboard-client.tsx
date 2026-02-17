"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealHealthWidget } from "@/components/crm/deal-health-widget"
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

            <div className="relative z-10 flex flex-col h-full p-8 md:p-12 gap-10">
                <Header
                    userName={userName}
                    userId={userId}
                    workspaceId={workspace.id}
                    onNewDeal={() => setIsNewDealModalOpen(true)}
                />

                {/* Dashboard Content Grid - 48px gap (triple gap) */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 flex-1 min-h-0">

                    {/* Row 1: KPI Cards - Full Width */}
                    <div className="xl:col-span-4 shrink-0">
                        <DealHealthWidget deals={deals} />
                    </div>

                    {/* Row 2: Main Workspace (Kanban) & Sidebar (Activity) */}

                    {/* Kanban Board - Takes 3 columns on large screens */}
                    <div className="xl:col-span-3 h-[500px] xl:h-auto min-h-0 overflow-hidden flex flex-col pt-2">
                        <KanbanBoard deals={deals} industryType={workspace.industryType} />
                    </div>

                    {/* Activity Feed - Side Panel, 1 column */}
                    <div className="xl:col-span-1 h-[300px] xl:h-auto min-h-0 overflow-hidden pt-2">
                        <ActivityFeed workspaceId={workspace.id} className="h-full" />
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
