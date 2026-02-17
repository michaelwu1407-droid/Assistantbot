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
                    <div className="xl:col-span-4 shrink-0 h-[180px]">
                        <DealHealthWidget deals={deals} />
                    </div>

                    {/* Row 2: Main Workspace (Kanban) & Sidebar (Activity) */}

                    {/* Kanban Board - Takes 3 columns, wrapped in Ottorize Panel */}
                    <div className="xl:col-span-3 h-[600px] xl:h-auto min-h-0 overflow-hidden flex flex-col pt-2">
                        <div className="ott-card w-full h-full p-6 flex flex-col bg-white overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0F172A]">Task Completed</h2>
                                    <p className="text-sm text-[#94A3B8]">This is task completed on this year</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Fake 'Complete' / 'Not Complete' Legend for visuals */}
                                    <div className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
                                        <div className="w-3 h-2 rounded-full bg-[#00D28B]" /> Complete
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
                                        <div className="w-3 h-2 rounded-full bg-amber-400" /> Not Completed
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <KanbanBoard deals={deals} industryType={workspace.industryType} />
                            </div>
                        </div>
                    </div>

                    {/* Activity Feed - Side Panel, 1 column, wrapped in Ottorize Panel */}
                    <div className="xl:col-span-1 h-[400px] xl:h-auto min-h-0 overflow-hidden pt-2">
                        <div className="ott-card w-full h-full p-6 flex flex-col bg-white overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0F172A]">Role Efficacy</h2>
                                    <p className="text-sm text-[#94A3B8]">Potential role effectiveness</p>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                                <ActivityFeed workspaceId={workspace.id} className="h-full" />
                            </div>
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
