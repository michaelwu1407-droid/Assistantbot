"use client"

import { useState, useEffect } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { ActivityModal } from "@/components/modals/activity-modal"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"
import { ensureDailyNotifications } from "@/actions/notification-actions"
import { Header } from "./header"

interface TeamMemberOption {
    id: string
    name: string | null
    email: string
    role: string
    isCurrentUser?: boolean
}

interface DashboardClientProps {
    workspace: WorkspaceView
    deals: DealView[]
    teamMembers: TeamMemberOption[]
    userName: string
    userId: string
}

export function DashboardClient({ workspace, deals, teamMembers, userName, userId }: DashboardClientProps) {
    const currentUser = teamMembers.find((m) => (m as { isCurrentUser?: boolean }).isCurrentUser)
    const currentUserRole = currentUser?.role ?? "TEAM_MEMBER"
    const defaultFilter =
        currentUserRole === "TEAM_MEMBER" && currentUser?.id ? currentUser.id : null
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
    const [filterByUserId, setFilterByUserId] = useState<string | null>(defaultFilter)

    useEffect(() => {
        ensureDailyNotifications(workspace.id).catch(() => { })
    }, [workspace.id])

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full p-2 md:p-3 md:pt-2 gap-1.5">
                <Header
                    userName={userName}
                    userId={userId}
                    workspaceId={workspace.id}
                    teamMembers={teamMembers}
                    filterByUserId={filterByUserId}
                    onFilterByUserChange={setFilterByUserId}
                    onNewDeal={() => setIsNewDealModalOpen(true)}
                />

                {/* Dashboard Content Grid — no containment; shape + colour separate the two zones */}
                <div className="flex flex-col flex-1 min-h-0 gap-0">

                    {/* Top row: pill-shaped cards, distinct background */}
                    <div className="shrink-0 flex flex-col sm:flex-row w-full gap-2 sm:gap-3 min-h-[52px] sm:min-h-[60px] px-1 pt-0.5 pb-1.5 sm:pb-2 bg-slate-100/70 dark:bg-slate-800/40 overflow-x-auto">
                        <DashboardKpiCards deals={deals} />
                        <div className="flex-[2.5] min-w-0 h-[52px] sm:h-[60px] max-h-[60px]">
                            <div
                                className="ott-card rounded-[20px] w-full h-full p-2 sm:p-3 flex flex-col bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm border border-slate-200/60 dark:border-slate-700/50 cursor-pointer hover:border-primary/50 transition-colors group"
                                onClick={() => setIsActivityModalOpen(true)}
                            >
                                <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 tracking-tight uppercase leading-none mb-1 sm:mb-2 shrink-0 group-hover:text-primary transition-colors">
                                    Activity (Click to Expand)
                                </span>
                                <div className="pointer-events-none flex-1 overflow-hidden min-h-0">
                                    <ActivityFeed workspaceId={workspace.id} className="h-full w-full" compact={true} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kanban: distinct zone with background to differentiate from dashboard */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col pt-1 bg-slate-200/40 dark:bg-slate-800/60 rounded-t-xl">
                        <div className="h-full w-full overflow-hidden min-h-0 rounded-xl bg-white/95 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/50 shadow-sm">
                            <KanbanBoard
                                deals={deals}
                                industryType={workspace.industryType}
                                filterByUserId={filterByUserId}
                                teamMembers={teamMembers}
                                currentUserRole={currentUserRole}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <NewDealModal
                isOpen={isNewDealModalOpen}
                onClose={() => setIsNewDealModalOpen(false)}
                workspaceId={workspace.id}
                teamMembers={teamMembers}
            />

            <ActivityModal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                workspaceId={workspace.id}
            />
        </div>
    )
}
