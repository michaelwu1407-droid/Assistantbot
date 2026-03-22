"use client"

import { useState, useEffect } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { ActivityModal } from "@/components/modals/activity-modal"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"
import { ensureDailyNotifications } from "@/actions/notification-actions"
import { useShellStore } from "@/lib/store"
import { Header } from "./header"
import { Button } from "@/components/ui/button"
import { Plus, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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
    const FILTER_ALL = "__all__"
    const currentUser = teamMembers.find((m) => (m as { isCurrentUser?: boolean }).isCurrentUser)
    const currentUserRole = currentUser?.role ?? "TEAM_MEMBER"
    const defaultFilter =
        currentUserRole === "TEAM_MEMBER" && currentUser?.id ? currentUser.id : null
    const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
    const [filterByUserId, setFilterByUserId] = useState<string | null>(defaultFilter)

    useEffect(() => {
        ensureDailyNotifications(workspace.id).catch(() => {})
    }, [workspace.id])

    const hasTeamFilter = teamMembers.length > 0
    const filterSelectValue =
        hasTeamFilter && filterByUserId && teamMembers.some((m) => m.id === filterByUserId)
            ? filterByUserId
            : FILTER_ALL
    const kanbanFilterByUserId = hasTeamFilter ? filterByUserId : null

    const assistantPanelExpanded = useShellStore((s) => s.assistantPanelExpanded)

    const newDealLabel =
        workspace.industryType === "TRADES"
            ? "New Job"
            : workspace.industryType === "REAL_ESTATE"
              ? "New Listing"
              : "New Deal"

    const pipelineHeaderActions = (
        <>
            <Button
                id="new-deal-btn"
                onClick={() => setIsNewDealModalOpen(true)}
                className="h-9 min-h-9 min-w-[4.75rem] max-w-[4.75rem] px-2.5 text-xs font-bold sunlight-shadow truncate"
            >
                <Plus className="h-3.5 w-3.5 mr-0.5 shrink-0" />
                {newDealLabel}
            </Button>
            <Select
                disabled={!hasTeamFilter}
                value={filterSelectValue}
                onValueChange={(v) => setFilterByUserId(v === FILTER_ALL ? null : v)}
            >
                <SelectTrigger
                    title={!hasTeamFilter ? "Invite team in Settings to filter by person" : undefined}
                    className="h-9 min-h-9 min-w-[4.75rem] max-w-[4.75rem] px-2.5 bg-muted rounded-lg border-none text-xs font-medium hover:bg-muted/80 transition-colors gap-1 disabled:opacity-60"
                >
                    <Filter className="h-3 w-3" />
                    <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={FILTER_ALL}>All</SelectItem>
                    {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                            {m.name || m.email}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    )

    return (
        <div className="dashboard-stitch h-full flex flex-col overflow-hidden bg-transparent text-[15px] leading-snug">
            {/* Sticky template top bar — stays visible while KPI + board scroll */}
            <div className="sticky top-0 z-20 shrink-0 border-b border-border/10 bg-[var(--main-canvas)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--main-canvas)]/80">
                <Header
                    userName={userName}
                    userId={userId}
                    workspaceId={workspace.id}
                    userRole={currentUserRole}
                    onOpenActivity={() => setIsActivityModalOpen(true)}
                    headerActions={pipelineHeaderActions}
                />
            </div>

            {/* Scrollable main — KPI + pipeline + Kanban */}
            <main
                className={cn(
                    /* modest bottom padding — column lists add their own pb; FABs float above content */
                    "flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 min-w-0",
                    assistantPanelExpanded ? "overflow-x-hidden" : "overflow-x-auto md:overflow-x-hidden"
                )}
            >
                <div
                    className={cn(
                        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
                        assistantPanelExpanded && "overflow-x-auto"
                    )}
                >
                    <div
                        className={cn(
                            "flex min-h-0 flex-1 flex-col overflow-hidden",
                            assistantPanelExpanded && "min-w-[1200px]"
                        )}
                    >
                        {/* Hero Metrics — pb-0 so the divider below sits in one symmetric gap (no extra grey band below cards) */}
                        <div className="-mx-6 shrink-0 px-6 pt-5 pb-0 bg-muted/35">
                            <DashboardKpiCards deals={deals} />
                        </div>

                        {/* Equal space above and below the rule between KPI strip and Kanban */}
                        <div className="-mx-6 shrink-0 px-6 pt-5 pb-2.5 bg-transparent" aria-hidden>
                            <div className="h-px w-full bg-border/80" />
                        </div>

                        <section className="flex min-h-0 flex-1 flex-col overflow-hidden pb-1 pt-0">
                            {/* Match KPI strip horizontal bleed (-mx-6 px-6) so Kanban lines up with the four cards */}
                            <div className="-mx-6 flex min-h-0 min-w-0 flex-1 overflow-hidden px-6">
                                <KanbanBoard
                                    className="min-h-0 min-w-0 flex-1"
                                    deals={deals}
                                    industryType={workspace.industryType}
                                    filterByUserId={kanbanFilterByUserId}
                                    teamMembers={teamMembers}
                                    currentUserRole={currentUserRole}
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </main>

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
