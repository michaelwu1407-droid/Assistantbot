"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { DealView } from "@/actions/deal-actions"
import type { ActivityView } from "@/actions/activity-actions"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Activity } from "lucide-react"

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
        <div className="h-full flex flex-col space-y-4 p-4 md:p-6 overflow-hidden">
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

            {/* Top Row: Widgets (Pulse / Health / Activity) */}
            {/* Fixed height on desktop (h-56 = 224px) to ensure it doesn't push Kanban off screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 shrink-0 md:h-56">
                {/* Widget 1: Pipeline Pulse */}
                <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Pipeline Pulse
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end min-h-0">
                        <div className="text-xl md:text-2xl font-bold text-slate-900 truncate" title="$124,500">
                            $124,500
                        </div>
                        <p className="text-xs text-muted-foreground truncate">+12% from last month</p>
                    </CardContent>
                </Card>

                 {/* Widget 2: Health */}
                 <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            Active Deals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end min-h-0">
                        <div className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                            {deals.length}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">3 closing this week</p>
                    </CardContent>
                </Card>

                 {/* Widget 3: Recent Activity */}
                 {/* On tablet (md), span 2 cols. On desktop (xl), span 1. */}
                 {/* Height must be constrained to the grid row height */}
                 <div className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col md:col-span-2 xl:col-span-1 h-48 md:h-full">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                             <Activity className="h-4 w-4 text-amber-500" />
                             Recent Activity
                        </div>
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{activities.length}</span>
                    </div>
                    {/* flex-1 ensures it takes remaining height of card, overflow-hidden keeps it inside */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        <ActivityFeed activities={activities} className="border-0 shadow-none h-full" compact />
                    </div>
                 </div>
            </div>

            {/* Main Content Area: Kanban Board */}
            {/* flex-1 takes remaining vertical space. min-h-0 allows shrinking. */}
            <div className="flex-1 w-full overflow-hidden min-h-0 border-t border-slate-100 pt-4">
                 <KanbanBoard deals={deals} />
            </div>

            <NewDealModal
                isOpen={isNewDealModalOpen}
                onClose={() => setIsNewDealModalOpen(false)}
                workspaceId={workspaceId}
            />
        </div>
    )
}
