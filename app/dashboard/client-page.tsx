import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { DealView } from "@/actions/deal-actions"
import type { ActivityView } from "@/actions/activity-actions"
import { NewDealModal } from "@/components/modals/new-deal-modal"

interface DashboardClientPageProps {
    deals: DealView[]
    activities: ActivityView[]
    workspaceId: string
}

export default function DashboardClientPage({ deals, activities, workspaceId }: DashboardClientPageProps) {
    const { mode } = useDashboard()
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)

    if (mode === "chat") {
        return (
            <div className="h-full flex items-center justify-center opacity-50">
                <p className="text-slate-400">Focusing on Chat...</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
                    <p className="text-sm text-muted-foreground">Manage your deals and activity</p>
                </div>
                <Button onClick={() => setIsNewDealModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Deal
                </Button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full flex gap-6 overflow-hidden min-h-0">
                {/* Left: Kanban Board (70% approx) */}
                <div className="flex-1 min-w-[300px] h-full overflow-hidden">
                    <KanbanBoard deals={deals} />
                </div>

                {/* Right: Activity Feed / Widgets (30% approx) - Hidden on small screens */}
                <div className="hidden xl:block w-[350px] shrink-0 h-full overflow-hidden">
                    <ActivityFeed activities={activities} />
                </div>
            </div>

            <NewDealModal
                isOpen={isNewDealModalOpen}
                onClose={() => setIsNewDealModalOpen(false)}
                workspaceId={workspaceId}
            />
        </div>
    )
}
