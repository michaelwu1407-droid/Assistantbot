"use client"

import Link from "next/link"
import { MapPin, User } from "lucide-react"
import { DealView } from "@/actions/deal-actions"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PipelineDealListProps {
  deals: DealView[]
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  urgent: { label: "URGENT", className: "bg-destructive text-destructive-foreground" },
  sent: { label: "SENT", className: "bg-amber-100 text-amber-800" },
  scheduled: { label: "BOOKED", className: "bg-emerald-100 text-emerald-800" },
  paid: { label: "PAID", className: "bg-emerald-600 text-white" },
}

function inferBadge(deal: DealView) {
  if (deal.agentFlags?.includes("urgent")) return STATUS_BADGES.urgent
  if ((deal.health || "").toLowerCase() === "critical") return STATUS_BADGES.urgent
  if (deal.stage === "quote_sent") return STATUS_BADGES.sent
  if (deal.stage === "scheduled") return STATUS_BADGES.scheduled
  if (deal.stage === "completed") return STATUS_BADGES.paid
  return null
}

export function PipelineDealList({ deals }: PipelineDealListProps) {
  if (deals.length === 0) {
    return (
      <div className="px-4 pt-6">
        <div className="ott-empty-state">
          <p className="ott-empty-state-title">No jobs in this stage</p>
          <p className="ott-empty-state-body">New leads will appear here as they come in.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3 px-4 pt-3 pb-6">
      {deals.map((deal) => {
        const badge = inferBadge(deal)
        return (
          <li key={deal.id}>
            <Link
              href={`/crm/deals/${deal.id}`}
              className="block overflow-hidden rounded-md border border-border bg-card shadow-sm active:opacity-80"
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="app-panel-title truncate">{deal.contactName || deal.company}</p>
                    <p className="app-body-primary mt-0.5 truncate">{deal.title}</p>
                  </div>
                  {deal.metadata && typeof (deal.metadata as Record<string, unknown>).hint === "string" && (
                    <span className="app-body-secondary shrink-0 text-right text-[12px] max-w-[6.5rem]">
                      {(deal.metadata as Record<string, string>).hint}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
                  {deal.address && (
                    <span className="flex items-center gap-1 truncate min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{deal.address.split(",")[0]}</span>
                    </span>
                  )}
                  {deal.assignedToName && (
                    <span className="flex items-center gap-1 truncate min-w-0">
                      <User className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="truncate">{deal.assignedToName.split(" ")[0]}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
                <span className="text-[15px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(deal.value || 0)}
                </span>
                {badge && (
                  <span
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider",
                      badge.className
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
