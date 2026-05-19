"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { DealView, WorkspaceView } from "@/actions/deal-actions"
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { PipelineStageChips, PIPELINE_STAGES } from "./pipeline-stage-chips"
import { PipelineDealList } from "./pipeline-deal-list"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PipelineMobileProps {
  workspace: WorkspaceView
  deals: DealView[]
  userName: string
  onAddDeal?: () => void
}

export function PipelineMobile({ workspace, deals, userName, onAddDeal }: PipelineMobileProps) {
  const [activeStage, setActiveStage] = useState<string>(PIPELINE_STAGES[0].id)

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealView[]>()
    for (const stage of PIPELINE_STAGES) map.set(stage.id, [])
    for (const deal of deals) {
      const key = (deal.stage || "new_request").toLowerCase()
      const list = map.get(key)
      if (list) list.push(deal)
    }
    return map
  }, [deals])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [id, list] of dealsByStage) counts[id] = list.length
    return counts
  }, [dealsByStage])

  const activeStageMeta = PIPELINE_STAGES.find((s) => s.id === activeStage) ?? PIPELINE_STAGES[0]
  const activeDeals = dealsByStage.get(activeStage) ?? []
  const activeTotal = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <>
      <MobileHeader
        pageTitle="Dashboard"
        userName={userName}
        workspaceInitial={workspace.name?.[0] ?? userName?.[0]}
      />

      <div className="px-4 pt-4 pb-2">
        <DashboardKpiCards deals={deals} />
      </div>

      <PipelineStageChips
        activeId={activeStage}
        counts={stageCounts}
        onSelect={setActiveStage}
      />

      <div className="px-4 pt-2">
        <div
          className={cn(
            "rounded-md border border-border bg-card p-4 shadow-sm",
            "flex items-center justify-between gap-3"
          )}
          style={{ borderLeft: `4px solid ${activeStageMeta.accent}` }}
        >
          <div className="min-w-0 flex-1">
            <p className="app-micro-label text-muted-foreground">{activeStageMeta.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(activeTotal)}
              </span>
              <span className="app-body-secondary">
                {activeDeals.length} {activeDeals.length === 1 ? "job" : "jobs"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddDeal}
            aria-label="Add deal"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-md"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <PipelineDealList deals={activeDeals} />
    </>
  )
}
