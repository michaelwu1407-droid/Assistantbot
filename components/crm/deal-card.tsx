"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, DollarSign, MapPin, Briefcase, User, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DealView } from "@/actions/deal-actions"
import { format } from "date-fns"

interface DealCardProps {
  deal: DealView
  overlay?: boolean
  onOpenModal?: () => void
  onDelete?: () => void | Promise<void>
}

function formatScheduledTime(scheduledAt: Date | null | undefined): string {
  if (!scheduledAt) return "—"
  const d = new Date(scheduledAt)
  return format(d, "MMM d, h:mm a")
}

export function DealCard({ deal, overlay, onOpenModal, onDelete }: DealCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: deal.id,
    data: {
      type: "Deal",
      deal
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  let cardClasses = "ott-card rounded-[20px] bg-white hover:border-[#00D28B] p-4 border border-slate-200/60 dark:border-slate-700/50"
  let statusLabel = ""
  let statusClass = ""

  if (deal.health?.status === "ROTTING") {
    cardClasses = "ott-card rounded-[20px] bg-red-50 border-red-500/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] p-4 dark:border-red-500/40"
    statusLabel = "Urgent"
    statusClass = "bg-red-100 text-red-700 border-red-200"
  } else if (deal.health?.status === "STALE") {
    cardClasses = "ott-card rounded-[20px] bg-amber-50 border-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] p-4 dark:border-amber-500/40"
    statusLabel = "Follow up"
    statusClass = "bg-amber-100 text-amber-700 border-amber-200"
  }
  const showHealthBadge = statusLabel !== ""

  if (overlay) {
    cardClasses += " cursor-grabbing shadow-2xl scale-105 rotate-2 z-50 ring-2 ring-[#00D28B]/20"
  } else if (isDragging) {
    cardClasses += " opacity-30 grayscale"
  } else {
    cardClasses += " cursor-grab active:cursor-grabbing"
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      {/* Draggable area: whole card. Bin is a sibling so it doesn't start drag. Activation distance (in Kanban) turns small moves into click. */}
      <div
        className={cn("relative overflow-hidden", cardClasses)}
        {...(!overlay ? { ...attributes, ...listeners } : {})}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-card-click]')) return
          if (onOpenModal) onOpenModal()
          else window.location.href = `/dashboard/deals/${deal.id}`
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (onOpenModal) onOpenModal()
            else window.location.href = `/dashboard/deals/${deal.id}`
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Top right: added date by default; Follow up / Urgent when condition triggered */}
        <div className="absolute top-3 right-3 z-10 text-right">
          {showHealthBadge ? (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide border",
                statusClass
              )}
              title="Follow up = no activity for a while; Urgent = needs attention now"
            >
              {statusLabel}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 dark:text-slate-400" title="Date added">
              {format(new Date(deal.createdAt), "MMM d")}
            </span>
          )}
        </div>

        <div className="space-y-2.5 relative z-10 pr-20">
          {/* Customer name */}
          <div className="flex items-center gap-1.5 text-[#0F172A] font-semibold text-sm">
            <User className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">{deal.contactName || "No name"}</span>
          </div>

          {/* Address */}
          {deal.address && (
            <div className="flex items-start gap-1.5 text-[11px] text-[#64748B]">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="truncate line-clamp-2">{deal.address}</span>
            </div>
          )}

          {/* Job (title) */}
          <div className="flex items-center gap-1.5 text-[#0F172A] font-medium text-sm">
            <Briefcase className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">{deal.title}</span>
          </div>

          {/* Bottom row: value LHS, scheduled time RHS when set */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
            <div className="flex items-center text-[#0F172A] font-bold text-sm bg-[#F8FAFC] dark:bg-slate-800/50 px-2 py-0.5 rounded border border-[#E2E8F0] dark:border-slate-600/50">
              <DollarSign className="w-3 h-3 text-[#00D28B] mr-0.5 shrink-0" />
              {deal.value.toLocaleString()}
            </div>
            {deal.scheduledAt ? (
              <div className="flex items-center text-[10px] text-[#64748B] dark:text-slate-400">
                <Calendar className="w-3 h-3 mr-1 shrink-0" />
                {formatScheduledTime(deal.scheduledAt)}
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
      {/* Delete (move to Deleted jobs) at bottom right */}
      {onDelete && !overlay && (
        <button
          type="button"
          data-no-card-click
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete()
          }}
          className="absolute bottom-3 right-3 z-20 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Move to Deleted jobs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
