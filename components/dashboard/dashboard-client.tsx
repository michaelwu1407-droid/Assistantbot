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
        <div className="h-full flex flex-col gap-4 p-4 md:p-6 overflow-hidden">
            <Header
                userName={userName}
                userId={userId}
                workspaceId={workspace.id}
                onNewDeal={() => setIsNewDealModalOpen(true)}
            />

            {/* Top Row: Health Widget Only */}
            <div className="shrink-0">
                <DealHealthWidget deals={deals} />
            </div>

            {/* Middle Row: Activity & Kanban side by side on large screens */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 min-h-0 overflow-hidden">
                {/* Activity Feed - Takes 1 column */}
                <div className="xl:col-span-1 h-full min-h-0 overflow-hidden">
                    <ActivityFeed workspaceId={workspace.id} />
                </div>

                {/* Kanban - Takes 3 columns, full width */}
                <div className="xl:col-span-3 h-full min-h-0 overflow-hidden">
                    <KanbanBoard deals={deals} industryType={workspace.industryType} />
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
