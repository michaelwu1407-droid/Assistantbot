"use client"

import { cn } from "@/lib/utils"

export const PIPELINE_STAGES: { id: string; label: string; accent: string }[] = [
  { id: "new_request", label: "New request", accent: "rgb(59 130 246)" },
  { id: "quote_sent", label: "Quote sent", accent: "rgb(245 158 11)" },
  { id: "scheduled", label: "Scheduled", accent: "rgb(16 185 129)" },
  { id: "ready_to_invoice", label: "Awaiting", accent: "rgb(168 85 247)" },
  { id: "completed", label: "Complete", accent: "rgb(100 116 139)" },
]

interface PipelineStageChipsProps {
  activeId: string
  counts: Record<string, number>
  onSelect: (id: string) => void
}

export function PipelineStageChips({ activeId, counts, onSelect }: PipelineStageChipsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-3">
      <div className="flex w-max items-center gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const active = stage.id === activeId
          const count = counts[stage.id] ?? 0
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelect(stage.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors whitespace-nowrap",
                active
                  ? "border-border bg-card text-foreground shadow-sm"
                  : "border-transparent bg-muted/40 text-muted-foreground"
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: stage.accent }}
                aria-hidden
              />
              <span>{stage.label}</span>
              <span
                className={cn(
                  "tabular-nums text-[12px]",
                  active ? "text-muted-foreground" : "text-muted-foreground/70"
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
