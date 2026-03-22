"use client"

import { Fragment } from "react"
import { Calendar, ChevronDown, ChevronRight, Edit, LayoutList } from "lucide-react"
import { cn } from "@/lib/utils"
import { getKanbanStagePillClasses } from "@/lib/deal-utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SAMPLE_STAGE = "Scheduled"
const SAMPLE_SUB = "Job is on the calendar"

const PIPELINE_STEPS = [
  { id: "new_request", label: "New" },
  { id: "quote_sent", label: "Quote" },
  { id: "scheduled", label: "Scheduled", current: true },
  { id: "ready_to_invoice", label: "Pay" },
  { id: "completed", label: "Done" },
]

/**
 * Static previews: **current** header (stage dropdown + Edit) plus older stage-only layout ideas.
 * Open `/crm/design/deal-detail-modal` to compare.
 */
export function DealDetailStageDemos() {
  return (
    <div className="space-y-10 p-6">
      <div>
        <h1 className="text-lg font-semibold">Deal modal — stage in header</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Production uses a <strong>stage dropdown</strong> (with chevron) on the <strong>left</strong> of{" "}
          <strong>Edit</strong> in the top-right area. Choosing a stage runs the same move as dragging the card on the
          Kanban board.
        </p>
      </div>

      {/* Production header mock */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Production — header</h2>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">[Demo] Job title | Pat Overdue</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Website • <span className="font-medium text-emerald-600">$3,200</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className={cn(
                      "inline-flex h-8 min-w-[9rem] justify-between gap-2 rounded-md border-0 px-3 text-xs font-medium text-white shadow-sm no-underline hover:no-underline",
                      getKanbanStagePillClasses("SCHEDULED")
                    )}
                  >
                    <span className="truncate text-left">{SAMPLE_STAGE}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {["New request", "Quote sent", "Scheduled", "Awaiting payment", "Completed", "Lost", "Deleted jobs"].map(
                    (label) => (
                      <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Below: earlier experiments (strip / mini pipeline / etc.) kept for reference only — not used in production.
      </p>

      {/* 1 — Strip */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference — Coloured strip</h2>
        <p className="text-xs text-muted-foreground">Full-width bar under the title row.</p>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="px-4 py-3">
            <p className="text-sm font-bold">[Demo] Job title | Pat Overdue</p>
          </div>
          <div className="flex items-center justify-between bg-status-scheduled px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
            <span>{SAMPLE_STAGE}</span>
            <span className="font-normal opacity-90">{SAMPLE_SUB}</span>
          </div>
        </div>
      </section>

      {/* 2 — Mini pipeline */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference — Mini pipeline</h2>
        <p className="text-xs text-muted-foreground">Five steps; current stage highlighted.</p>
        <div className="overflow-hidden rounded-lg border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold">[Demo] Job title | Pat Overdue</p>
          <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg bg-muted/60 p-1">
            {PIPELINE_STEPS.map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 self-center text-muted-foreground/50" /> : null}
                <div
                  className={cn(
                    "flex min-w-[3.5rem] flex-1 flex-col items-center rounded-md py-2 text-[10px] font-bold uppercase",
                    s.current ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <LayoutList className="mb-0.5 h-3 w-3 opacity-80" />
                  {s.label}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Large type */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference — Large typographic</h2>
        <p className="text-xs text-muted-foreground">Stage as a second headline.</p>
        <div className="overflow-hidden rounded-lg border bg-card px-4 py-3 shadow-sm">
          <p className="text-sm font-bold">[Demo] Job title | Pat Overdue</p>
          <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-emerald-600">{SAMPLE_STAGE}</p>
          <p className="text-xs text-muted-foreground">{SAMPLE_SUB}</p>
        </div>
      </section>

      {/* 4 — Left border + icon */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference — Left border block</h2>
        <p className="text-xs text-muted-foreground">Accent bar + icon + label.</p>
        <div className="overflow-hidden rounded-lg border bg-card px-4 py-3 shadow-sm">
          <p className="text-sm font-bold">[Demo] Job title | Pat Overdue</p>
          <div className="mt-3 flex items-stretch gap-3 rounded-md border border-status-scheduled/30 bg-status-scheduled/10 pl-0 dark:bg-status-scheduled/20">
            <div className="w-1.5 shrink-0 rounded-l bg-status-scheduled" />
            <div className="flex items-center gap-2 py-2 pr-3">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-foreground">{SAMPLE_STAGE}</p>
                <p className="text-xs text-muted-foreground">{SAMPLE_SUB}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Tile */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference — Stage tile</h2>
        <p className="text-xs text-muted-foreground">Larger padded tile, soft stage tint.</p>
        <div className="overflow-hidden rounded-lg border bg-card px-4 py-3 shadow-sm">
          <p className="text-sm font-bold">[Demo] Job title | Pat Overdue</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-status-scheduled/25 bg-status-scheduled/15 px-4 py-2.5 dark:bg-status-scheduled/25">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold uppercase tracking-wide text-foreground">{SAMPLE_STAGE}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
