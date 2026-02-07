"use client"

import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DealView } from "@/actions/deal-actions"

// Re-map the type to match frontend expectations if needed, or update components to use DealView
// For now, I'll update DealCard/KanbanBoard to accept DealView in a separate step or just cast if compatible.
// DealView has: id, title, company, value, stage, lastActivityDate, health, contactName
// Our mock Deal had: id, title, company, value, stage, lastActivityDate, contactName (Health was computed inside DealCard in mock, but server provides it now)

export function ClientDashboardWrapper({ deals }: { deals: DealView[] }) {
    const { mode } = useDashboard()

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
                    <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
                    <p className="text-sm text-slate-500">Manage your deals and activity</p>
                </div>
                <Button>
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
                    <ActivityFeed />
                </div>
            </div>
        </div>
    )
}
