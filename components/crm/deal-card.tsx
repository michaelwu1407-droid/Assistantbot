"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, DollarSign, MapPin, Briefcase, User, Trash2, AlertTriangle, UserPlus, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { DealView } from "@/actions/deal-actions"
import { format } from "date-fns"
import { checkIfDealIsOverdue, getOverdueStyling } from "@/lib/deal-utils"
import { StaleJobReconciliationModal } from "./stale-job-reconciliation-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TeamMemberOption {
  id: string
  name: string | null
  email: string
  role: string
}

interface DealCardProps {
  deal: DealView
  overlay?: boolean
  columnId?: string
  teamMembers?: TeamMemberOption[]
  onAssign?: (userId: string | null) => void | Promise<void>
  onOpenModal?: () => void
  onDelete?: () => void | Promise<void>
  onReconcile?: (dealId: string) => void
}

function formatScheduledTime(scheduledAt: Date | null | undefined): string {
  if (!scheduledAt) return "—"
  const d = new Date(scheduledAt)
  return format(d, "MMM d, h:mm a")
}

export function DealCard({ deal, overlay, columnId, teamMembers = [], onAssign, onOpenModal, onDelete, onReconcile }: DealCardProps) {
  const [showReconciliationModal, setShowReconciliationModal] = useState(false)
  
  // Check if deal is overdue
  const overdueStyling = getOverdueStyling({
    stage: deal.stage as any,
    scheduledAt: deal.scheduledAt || null,
    actualOutcome: deal.actualOutcome || null
  })
  const router = useRouter()
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
  
  // Add overdue styling
  if (overdueStyling.borderClass) {
    cardClasses += ` ${overdueStyling.borderClass}`
  }

  if (deal.health?.status === "ROTTING") {
    cardClasses = "ott-card rounded-[20px] bg-red-50 border-red-500/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] p-4 dark:border-red-500/40"
    statusLabel = "Urgent"
    statusClass = "bg-red-100 text-red-700 border-red-200"
  } else if (deal.health?.status === "STALE") {
    cardClasses = "ott-card rounded-[20px] bg-amber-50 border-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] p-4 dark:border-amber-500/40"
    statusLabel = "Follow up"
    statusClass = "bg-amber-100 text-amber-700 border-amber-200"
  }

  if (deal.isDraft) {
    cardClasses = "ott-card rounded-[20px] bg-indigo-50/50 border-indigo-300 border-dashed p-4 dark:border-indigo-500/40"
    statusLabel = "Draft"
    statusClass = "bg-indigo-100 text-indigo-700 border-indigo-200"
  }

  // Pending approval: in Completed column but styled differently until manager approves
  if (deal.stage === "pending_approval") {
    cardClasses = "ott-card rounded-[20px] bg-amber-50/80 border-amber-400 border-2 border-dashed p-4 dark:bg-amber-950/30 dark:border-amber-500/60"
    statusLabel = "Pending approval"
    statusClass = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700"
  }

  // Rejected: was sent back from completion; show Rejected badge
  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const isRejected = !!(metadata.completionRejectedAt || metadata.completionRejectionReason)
  if (isRejected && statusLabel === "") {
    statusLabel = "Rejected"
    statusClass = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200"
  }

  const showHealthBadge = statusLabel !== "" || overdueStyling.badgeText !== ""

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
          else if (deal.contactId) router.push(`/dashboard/contacts/${deal.contactId}`)
          else router.push(`/dashboard/deals/${deal.id}`)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (onOpenModal) onOpenModal()
            else if (deal.contactId) router.push(`/dashboard/contacts/${deal.contactId}`)
            else router.push(`/dashboard/deals/${deal.id}`)
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Top right: added date by default; Follow up / Urgent when condition triggered */}
        <div className="absolute top-3 right-3 z-10 text-right">
          {overdueStyling.badgeText ? (
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide border flex items-center gap-1 cursor-pointer hover:opacity-80",
                  overdueStyling.badgeClass
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onReconcile) {
                    onReconcile(deal.id)
                  } else {
                    setShowReconciliationModal(true)
                  }
                }}
                title="Click to reconcile this overdue job"
              >
                <AlertTriangle className="w-3 h-3" />
                {overdueStyling.badgeText}
              </span>
              {statusLabel && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide border",
                    statusClass
                  )}
                  title="Follow up = no activity for a while; Urgent = needs attention now"
                >
                  {statusLabel}
                </span>
              )}
            </div>
          ) : showHealthBadge ? (
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

        <div className="space-y-2.5 relative z-10 pr-12">
          {/* Customer name */}
          <div className="flex items-center gap-1.5 text-[#0F172A] font-semibold text-xs">
            <User className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">{deal.contactName || "No name"}</span>
          </div>

          {/* Address */}
          {deal.address && (
            <div className="flex items-start gap-1.5 text-xs text-[#64748B] dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="truncate line-clamp-2">{deal.address}</span>
            </div>
          )}

          {/* Job (title) */}
          <div className="flex items-center gap-1.5 text-[#0F172A] font-medium text-xs">
            <Briefcase className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">{deal.title}</span>
          </div>

          {/* Assignee: optional in earlier stages, required in Scheduled (show warning if unassigned) */}
          {(teamMembers.length > 0 || deal.assignedToName) && (
            <div className="flex items-center justify-between gap-1" data-no-card-click>
              <span className={cn(
                "text-[11px] flex items-center gap-1",
                columnId === "scheduled" && !deal.assignedToName
                  ? "text-amber-600 dark:text-amber-400 font-medium"
                  : "text-[#64748B] dark:text-slate-400"
              )}>
                <User className="w-3 h-3 shrink-0" />
                {deal.assignedToName ?? (columnId === "scheduled" ? "Assign team member" : "Unassigned")}
              </span>
              {onAssign && teamMembers.length > 0 && !overlay && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="text-[11px] text-[#00D28B] hover:underline flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserPlus className="w-3 h-3" /> Assign
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onAssign(null)}>
                      Unassign
                    </DropdownMenuItem>
                    {teamMembers.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => onAssign(m.id)}>
                        {m.name || m.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}


          {/* Lead Source badge */}
          {deal.source && (
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
                {deal.source}
              </span>
            </div>
          )}

          {/* Agent Triage Flags — warnings from AI Bouncer/Advisor engine */}
          {deal.agentFlags && deal.agentFlags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {deal.agentFlags.map((flag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700"
                  title={`AI Flag: ${flag}`}
                >
                  <Flag className="w-2.5 h-2.5" />
                  {flag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom row: value LHS, scheduled time RHS – same text size, extend right */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
            <div className="flex items-center text-[11px] text-[#0F172A] font-bold bg-[#F8FAFC] dark:bg-slate-800/50 px-2 py-0.5 rounded border border-[#E2E8F0] dark:border-slate-600/50">
              {deal.invoicedAmount !== undefined ? (
                <>
                  <span className="text-emerald-600 mr-1 flex items-center"><DollarSign className="w-3 h-3 text-[#00D28B] mr-0.5 shrink-0" /> Inv:</span>
                  ${deal.invoicedAmount.toLocaleString()}
                </>
              ) : (
                <>
                  <DollarSign className="w-3 h-3 text-[#00D28B] mr-0.5 shrink-0" />
                  {deal.value.toLocaleString()}
                </>
              )}
            </div>
            {deal.scheduledAt ? (
              <div className="flex items-center text-xs text-[#64748B] dark:text-slate-400">
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
      
      {/* Stale Job Reconciliation Modal */}
      {showReconciliationModal && (
        <StaleJobReconciliationModal
          deal={deal}
          onClose={() => setShowReconciliationModal(false)}
          onSuccess={() => {
            setShowReconciliationModal(false)
            // Trigger a refresh of the deals data
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
