"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
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

            <div className="relative z-10 flex flex-col h-full p-2 md:p-3 md:pt-2 gap-2">
                <Header
                    userName={userName}
                    userId={userId}
                    workspaceId={workspace.id}
                    onNewDeal={() => setIsNewDealModalOpen(true)}
                />

                {/* Dashboard Content Grid — no containment; shape + colour separate the two zones */}
                <div className="flex flex-col flex-1 min-h-0 gap-0">

                    {/* Top row: pill-shaped cards, distinct background */}
                    <div className="shrink-0 flex w-full gap-4 min-h-[70px] px-1 pt-1 pb-4 bg-slate-100/70 dark:bg-slate-800/40">
                        <DashboardKpiCards deals={deals} />
                        <div className="flex-[2.5] min-w-0 h-[70px] max-h-[70px]">
                            <div className="ott-card rounded-[20px] w-full h-full p-3 flex flex-col bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                                <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 tracking-tight uppercase leading-none mb-2 shrink-0">
                                    Activity
                                </span>
                                <ActivityFeed workspaceId={workspace.id} className="flex-1 min-h-0 overflow-y-auto" compact={true} />
                            </div>
                        </div>
                    </div>

                    {/* Kanban: different shape (moderate container radius), different zone colour */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col pt-4">
                        <div className="h-full w-full overflow-hidden min-h-0 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/50">
                            <KanbanBoard deals={deals} industryType={workspace.industryType} />
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
