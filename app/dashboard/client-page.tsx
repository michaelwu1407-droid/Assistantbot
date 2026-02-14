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
        // MAIN CONTAINER: Fixed Flex Column
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            {/* 1. Header (Fixed Height, shrinks if needed) */}
            <div className="flex items-center justify-between shrink-0 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
                    <p className="text-sm text-muted-foreground">Manage your deals and activity</p>
                </div>
                <Button onClick={() => setIsNewDealModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Deal
                </Button>
            </div>

            {/* 2. Top Widgets (Fixed Max Height) */}
            {/* ABSOLUTE CONSTRAINT: This container CANNOT grow beyond 350px or 25% of screen */}
            {/* shrink-0 prevents it from collapsing to 0, max-h ensures it doesn't push Kanban out */}
            <div className="shrink-0 mb-4" style={{ maxHeight: 'min(350px, 25vh)', minHeight: '200px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full">
                    {/* Widget 1: Pipeline Pulse */}
                    <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden h-full min-w-0">
                        <CardHeader className="pb-2 shrink-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                Pipeline Pulse
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end min-h-0 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate w-full" title="$124,500">
                                $124,500
                            </div>
                            <p className="text-xs text-muted-foreground truncate w-full">+12% from last month</p>
                        </CardContent>
                    </Card>

                    {/* Widget 2: Active Deals */}
                    <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden h-full min-w-0">
                        <CardHeader className="pb-2 shrink-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-500" />
                                Active Deals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end min-h-0 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate w-full">
                                {deals.length}
                            </div>
                            <p className="text-xs text-muted-foreground truncate w-full">3 closing this week</p>
                        </CardContent>
                    </Card>

                    {/* Widget 3: Recent Activity */}
                    <div className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col md:col-span-2 xl:col-span-1 h-full max-h-[300px] min-w-0">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-amber-500" />
                                Recent Activity
                            </div>
                            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{activities.length}</span>
                        </div>
                        {/* Internal scrollable area with strict height */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <ActivityFeed activities={activities} className="border-0 shadow-none" compact />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content Area: Kanban Board */}
            {/* flex-1 ensures it takes ALL remaining vertical space */}
            {/* min-h-[500px] forces visibility even if widgets are tall */}
            <div className="flex-1 w-full overflow-hidden min-h-[500px] border-t border-slate-100 pt-4">
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
