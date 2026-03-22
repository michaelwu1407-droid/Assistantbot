"use client"

import { useState, useEffect, useMemo } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"
import { ensureDailyNotifications } from "@/actions/notification-actions"
import { useShellStore } from "@/lib/store"
import { useDashboardHeaderExtraSetter } from "@/components/dashboard/dashboard-header-extra-context"
import { Filter } from "lucide-react"
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

export function DashboardClient({ workspace, deals, teamMembers }: DashboardClientProps) {
    const FILTER_ALL = "__all__"
    const currentUser = teamMembers.find((m) => (m as { isCurrentUser?: boolean }).isCurrentUser)
    const currentUserRole = currentUser?.role ?? "TEAM_MEMBER"
    const defaultFilter =
        currentUserRole === "TEAM_MEMBER" && currentUser?.id ? currentUser.id : null
    const [filterByUserId, setFilterByUserId] = useState<string | null>(defaultFilter)
    const setHeaderExtra = useDashboardHeaderExtraSetter()

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

    /* Kanban filter only — “New Job” + rest of bar live in DashboardMainChrome */
    const pipelineFilterExtra = useMemo(
        () => (
            <Select
                disabled={!hasTeamFilter}
                value={filterSelectValue}
                onValueChange={(v) => setFilterByUserId(v === FILTER_ALL ? null : v)}
            >
                <SelectTrigger
                    id="pipeline-filter-trigger"
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
        ),
        [hasTeamFilter, filterSelectValue, teamMembers, filterByUserId]
    )

    useEffect(() => {
        setHeaderExtra(pipelineFilterExtra)
        return () => setHeaderExtra(null)
    }, [pipelineFilterExtra, setHeaderExtra])

    return (
        <div className="dashboard-stitch flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent text-[15px] leading-snug">
            {/* Scrollable main — KPI + pipeline + Kanban (brand header is DashboardMainChrome) */}
            <main
                className={cn(
                    "flex min-h-0 flex-1 flex-col overflow-hidden pb-6 min-w-0",
                    assistantPanelExpanded ? "pl-6 pr-0 overflow-x-hidden" : "px-6 overflow-x-auto md:overflow-x-hidden"
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
                        <div
                            className={cn(
                                "shrink-0 pt-5 pb-0 bg-muted/35",
                                assistantPanelExpanded ? "-ml-6 pl-6 pr-0" : "-mx-6 px-6"
                            )}
                        >
                            <DashboardKpiCards deals={deals} />
                        </div>

                        <div
                            className={cn(
                                "shrink-0 pt-5 pb-2.5 bg-transparent",
                                assistantPanelExpanded ? "-ml-6 pl-6 pr-0" : "-mx-6 px-6"
                            )}
                            aria-hidden
                        >
                            <div className="h-px w-full bg-border/80" />
                        </div>

                        <section className="flex min-h-0 flex-1 flex-col overflow-hidden pb-1 pt-0">
                            <div
                                className={cn(
                                    "flex min-h-0 min-w-0 flex-1 overflow-hidden",
                                    assistantPanelExpanded ? "-ml-6 pl-6 pr-0" : "-mx-6 px-6"
                                )}
                            >
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
        </div>
    )
}
