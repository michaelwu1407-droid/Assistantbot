"use client"

import { useState, useEffect, useMemo } from "react"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { DealView } from "@/actions/deal-actions"
import { WorkspaceView } from "@/actions/workspace-actions"
import { ensureDailyNotifications } from "@/actions/notification-actions"
import { useShellStore } from "@/lib/store"
import { useDashboardHeaderExtraSetter } from "@/components/dashboard/dashboard-header-extra-context"
import { Filter, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

interface KanbanFilterPreset {
    id: string
    name: string
    filters: KanbanFilters
}

interface KanbanFilters {
    query: string
    minValue: string
    maxValue: string
    startDate: string
    endDate: string
    location: string
    teamMemberId: string | null
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
    const FILTER_UNASSIGNED = "__unassigned__"
    const PRESETS_KEY = `kanban-filter-presets:${workspace.id}`
    const currentUser = teamMembers.find((m) => (m as { isCurrentUser?: boolean }).isCurrentUser)
    const currentUserRole = currentUser?.role ?? "TEAM_MEMBER"
    const defaultFilter =
        currentUserRole === "TEAM_MEMBER" && currentUser?.id ? currentUser.id : null
    const [filterOpen, setFilterOpen] = useState(false)
    const [presets, setPresets] = useState<KanbanFilterPreset[]>([])
    const [filters, setFilters] = useState<KanbanFilters>({
        query: "",
        minValue: "",
        maxValue: "",
        startDate: "",
        endDate: "",
        location: "",
        teamMemberId: defaultFilter,
    })
    const setHeaderExtra = useDashboardHeaderExtraSetter()

    useEffect(() => {
        ensureDailyNotifications(workspace.id).catch(() => {})
    }, [workspace.id])

    const hasTeamFilter = teamMembers.length > 0
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.query.trim()) count += 1
        if (filters.minValue.trim() || filters.maxValue.trim()) count += 1
        if (filters.startDate || filters.endDate) count += 1
        if (filters.location.trim()) count += 1
        if (filters.teamMemberId) count += 1
        return count
    }, [filters])

    const assistantPanelExpanded = useShellStore((s) => s.assistantPanelExpanded)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PRESETS_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw) as KanbanFilterPreset[]
            if (Array.isArray(parsed)) setPresets(parsed)
        } catch {
            // ignore malformed local data
        }
    }, [PRESETS_KEY])

    const persistPresets = (next: KanbanFilterPreset[]) => {
        setPresets(next)
        try {
            localStorage.setItem(PRESETS_KEY, JSON.stringify(next))
        } catch {
            // ignore storage errors
        }
    }

    const clearFilters = () => {
        setFilters({
            query: "",
            minValue: "",
            maxValue: "",
            startDate: "",
            endDate: "",
            location: "",
            teamMemberId: null,
        })
    }

    const saveCurrentPreset = () => {
        const name = window.prompt("Name this filter preset:")
        const trimmed = name?.trim()
        if (!trimmed) return
        const nextPreset: KanbanFilterPreset = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: trimmed,
            filters,
        }
        persistPresets([nextPreset, ...presets].slice(0, 20))
    }

    /* Kanban filter only — “New Job” + rest of bar live in DashboardMainChrome */
    const pipelineFilterExtra = useMemo(
        () => (
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="pipeline-filter-trigger"
                        variant="outline"
                        size="sm"
                        className="h-9 min-h-9 gap-1.5 rounded-lg border-none bg-muted px-2.5 text-xs font-medium hover:bg-muted/80"
                    >
                        <Filter className="h-3 w-3" />
                        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] space-y-3 p-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Quick search</Label>
                        <Input
                            value={filters.query}
                            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                            placeholder="Title, contact, or address"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Min value</Label>
                            <Input
                                type="number"
                                value={filters.minValue}
                                onChange={(e) => setFilters((prev) => ({ ...prev, minValue: e.target.value }))}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Max value</Label>
                            <Input
                                type="number"
                                value={filters.maxValue}
                                onChange={(e) => setFilters((prev) => ({ ...prev, maxValue: e.target.value }))}
                                placeholder="10000"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Start date</Label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">End date</Label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Location</Label>
                        <Input
                            value={filters.location}
                            onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
                            placeholder="Suburb or address"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Team member</Label>
                        <Select
                            disabled={!hasTeamFilter}
                            value={filters.teamMemberId ?? FILTER_ALL}
                            onValueChange={(v) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    teamMemberId: v === FILTER_ALL ? null : v,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All team members" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={FILTER_ALL}>All</SelectItem>
                                <SelectItem value={FILTER_UNASSIGNED}>Unassigned</SelectItem>
                                {teamMembers.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name || m.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1 border-t pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Saved presets</Label>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={saveCurrentPreset}>
                                <Save className="mr-1 h-3 w-3" />
                                Save
                            </Button>
                        </div>
                        {presets.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No presets yet.</p>
                        ) : (
                            <div className="max-h-32 space-y-1 overflow-y-auto">
                                {presets.map((preset) => (
                                    <div key={preset.id} className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 flex-1 justify-start text-xs"
                                            onClick={() => setFilters(preset.filters)}
                                        >
                                            {preset.name}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => persistPresets(presets.filter((p) => p.id !== preset.id))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end border-t pt-2">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                            Clear all
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        ),
        [filterOpen, activeFilterCount, filters, hasTeamFilter, teamMembers, presets]
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
                                    filters={filters}
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
