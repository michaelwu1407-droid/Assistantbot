"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealHealthWidget } from "@/components/crm/deal-health-widget"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"

interface DashboardClientProps {
    workspace: WorkspaceView
    deals: DealView[]
}

export function DashboardClient({ workspace, deals }: DashboardClientProps) {
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
                    <p className="text-sm text-slate-500">Manage your deals and activity</p>
                </div>
                <Button onClick={() => setIsNewDealModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Deal
                </Button>
            </div>

            {/* Health Widget */}
            <DealHealthWidget deals={deals} />

            {/* Main Content Area */}
            <div className="flex-1 w-full flex gap-6 overflow-hidden min-h-0">
                {/* Left: Kanban Board */}
                <div className="flex-1 min-w-[300px] h-full overflow-hidden">
                    <KanbanBoard deals={deals} />
                </div>

                {/* Right: Activity Feed / Widgets */}
                <div className="hidden xl:block w-[350px] shrink-0 h-full overflow-hidden">
                    <ActivityFeed />
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
