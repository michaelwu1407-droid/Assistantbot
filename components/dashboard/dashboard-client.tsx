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
        <div className="h-full flex flex-col gap-2 p-2 md:p-4 overflow-hidden">
            <Header
                userName={userName}
                userId={userId}
                workspaceId={workspace.id}
                onNewDeal={() => setIsNewDealModalOpen(true)}
            />

            {/* Top Row: Health Widgets + Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 shrink-0">
                {/* Health Widgets - Takes 2 columns */}
                <div className="xl:col-span-2">
                    <DealHealthWidget deals={deals} />
                </div>

                {/* Activity Feed - Takes 2 columns, matches single card height */}
                <div className="xl:col-span-2 h-[130px] overflow-hidden">
                    <ActivityFeed workspaceId={workspace.id} />
                </div>
            </div>

            {/* Kanban Board - Full width */}
            <div className="flex-1 w-full min-h-0 overflow-hidden">
                <KanbanBoard deals={deals} industryType={workspace.industryType} />
            </div>

            <NewDealModal
                isOpen={isNewDealModalOpen}
                onClose={() => setIsNewDealModalOpen(false)}
                workspaceId={workspace.id}
            />
        </div>
    )
}
