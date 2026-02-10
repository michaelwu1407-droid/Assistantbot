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
        <div className="h-full flex flex-col space-y-4 p-6">
            <Header
                userName={userName}
                userId={userId}
                workspaceId={workspace.id}
                onNewDeal={() => setIsNewDealModalOpen(true)}
            />

            {/* Top Row: Health & Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[400px] shrink-0">
                {/* Health Widget (2/3 width) */}
                <div className="xl:col-span-2 h-full overflow-hidden">
                    <DealHealthWidget deals={deals} />
                </div>

                {/* Activity Feed (1/3 width) - Moved here to give Kanban full width below */}
                <div className="h-full overflow-hidden">
                    <ActivityFeed workspaceId={workspace.id} />
                </div>
            </div>

            {/* Main Content Area - Full Width Kanban */}
            <div className="flex-1 w-full overflow-hidden min-h-0">
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
