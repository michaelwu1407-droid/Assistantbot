"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { MapPin, Briefcase, User, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { approveCompletion, approveDraft, DealView, rejectCompletion, rejectDraft } from "@/actions/deal-actions"
import { getOverdueStyling } from "@/lib/deal-utils"
import { StaleJobReconciliationModal } from "./stale-job-reconciliation-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { HoverScrollName } from "@/components/ui/hover-scroll-name"
import {
  formatDateTimeInTimezone,
  formatMonthDayInTimezone,
  formatTimeInTimezone,
  resolveWorkspaceTimezone,
} from "@/lib/timezone"

interface TeamMemberOption {
  id: string
  name: string | null
  email: string
  role: string
}

export type DealCardDecision =
  | { type: "approve_completion" }
  | { type: "reject_completion"; reason?: string }
  | { type: "approve_draft" }
  | { type: "reject_draft"; reason?: string }

interface DealCardProps {
  deal: DealView
  overlay?: boolean
  columnId?: string
  teamMembers?: TeamMemberOption[]
  onAssign?: (userId: string | null) => void | Promise<void>
  onOpenModal?: () => void
  onDelete?: () => void | Promise<void>
  onReconcile?: (dealId: string) => void
  isSelected?: boolean
  selectionMode?: boolean
  onToggleSelected?: (dealId: string, checked: boolean) => void
  onEnterSelectionMode?: (dealId: string) => void
  onDecisionApplied?: (decision: DealCardDecision) => void
  /** Used for Kanban inline completion approval; optional elsewhere. */
  currentUserRole?: string
}

/** Overdue bottom strip — 65% colour opacity (design reference: /crm/design/deal-cards). */
function overdueBannerOverlayClasses(_severity: "critical" | "warning" | "mild" | "none"): string {
  return "bg-red-500/65 text-white shadow-inner dark:bg-red-600/65"
}

/** Bottom strip for health / draft / pending — 65% opacity to match overdue / design page. */
function statusBannerOverlayClasses(label: string): string {
  switch (label) {
    case "Pending approval":
      return "bg-amber-400/65 text-amber-950 shadow-inner dark:bg-amber-500/65 dark:text-amber-950"
    case "Draft":
      return "bg-indigo-400/65 text-indigo-950 shadow-inner dark:bg-indigo-500/65 dark:text-indigo-950"
    case "Urgent":
      return "bg-red-400/65 text-red-950 shadow-inner dark:bg-red-500/65 dark:text-red-50"
    case "Follow up":
      return "bg-amber-400/65 text-amber-950 shadow-inner dark:bg-amber-500/65 dark:text-amber-950"
    case "Rejected":
      return "bg-red-400/65 text-red-950 shadow-inner dark:bg-red-500/65 dark:text-red-50"
    case "Needs review":
      return "bg-orange-400/65 text-orange-950 shadow-inner dark:bg-orange-500/65 dark:text-orange-950"
    default:
      return "bg-muted/65 text-foreground shadow-inner"
  }
}

/** Top-right: scheduled job date + time in workspace TZ (matches deal detail + schedule chips). */
function cornerDateLabel(deal: DealView): { text: string; title: string } {
  if (deal.scheduledAt) {
    const workspaceTimezone = resolveWorkspaceTimezone(deal.workspaceTimezone)
    const formattedDateTime = formatDateTimeInTimezone(deal.scheduledAt, workspaceTimezone)
    return {
      text: formattedDateTime,
      title: formatDateTimeInTimezone(deal.scheduledAt, workspaceTimezone),
    }
  }
  return { text: "-", title: "No scheduled date" }
}

export function DealCard({
  deal,
  overlay,
  columnId,
  teamMembers = [],
  onAssign,
  onOpenModal,
  onDelete,
  onReconcile,
  isSelected = false,
  selectionMode = false,
  onToggleSelected,
  onEnterSelectionMode,
  onDecisionApplied,
  currentUserRole = "TEAM_MEMBER",
}: DealCardProps) {
  const [showReconciliationModal, setShowReconciliationModal] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [pendingApprovalActionsOpen, setPendingApprovalActionsOpen] = useState(false)
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isManager = currentUserRole === "OWNER" || currentUserRole === "MANAGER"
  const showKanbanApproval =
    !overlay && isManager && deal.stage === "pending_approval"
  const showDraftApproval = !overlay && deal.isDraft
  const showBannerActions = showKanbanApproval || showDraftApproval

  // Check if deal is overdue
  const overdueStyling = getOverdueStyling({
    stage: deal.stage,
    scheduledAt: deal.scheduledAt || null,
    actualOutcome: deal.actualOutcome || null,
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
    animation: !overlay && selectionMode ? "kanban-card-wiggle 1.1s ease-in-out infinite" : undefined,
  }

  // Add an explicitly handled class toggle for simple interaction scaling
  let cardClasses = "group relative w-full rounded-[18px] bg-card ghost-border sunlight-shadow transition-all duration-200 cursor-pointer select-none"
  let statusLabel = ""

  /** When overdue, that is the only top-right status (no Urgent/Follow up/Draft/etc.). */
  const overdueOnlyStatus = overdueStyling.badgeText !== ""

  if (!overdueOnlyStatus) {
    if (deal.health?.status === "ROTTING") {
      statusLabel = "Urgent"
    } else if (deal.health?.status === "STALE") {
      statusLabel = "Follow up"
    }

    if (deal.aiTriageRecommendation === "HOLD_REVIEW") {
      statusLabel = "Needs review"
    }

    if (deal.isDraft) {
      cardClasses = "group relative w-full rounded-[18px] bg-indigo-50/60 border-2 border-dashed border-indigo-400 dark:bg-indigo-950/20 dark:border-indigo-500/60"
      statusLabel = "Draft"
    }

    if (deal.stage === "pending_approval") {
      cardClasses = "group relative w-full rounded-[18px] bg-amber-50/80 border-2 border-dashed border-amber-400 dark:bg-amber-950/30 dark:border-amber-500/60"
      statusLabel = "Pending approval"
    }

    // Rejected: was sent back from completion
    const metadata = (deal.metadata || {}) as Record<string, unknown>
    const isRejected = !!(metadata.completionRejectedAt || metadata.completionRejectionReason)
    if (isRejected && statusLabel === "") {
      statusLabel = "Rejected"
    }
  }

  // Add overdue border on top of base card (overdue wins over health/draft look)
  if (overdueStyling.borderClass) {
    cardClasses += ` ${overdueStyling.borderClass}`
  }

  /** Status / overdue: bottom overlay (3C) — coloured layer runs under price + status text (no white gap). */
  const showStatusBanner = !!overdueStyling.badgeText || (!!statusLabel && statusLabel.length > 0)
  const overlayLabel = overdueStyling.badgeText
    ? overdueStyling.badgeText
    : statusLabel
  const overlayBannerClass = overdueStyling.badgeText
    ? overdueBannerOverlayClasses(overdueStyling.severity)
    : statusBannerOverlayClasses(statusLabel)

  const dealMetadata = (deal.metadata ?? undefined) as Record<string, unknown> | undefined
  const isUnread = dealMetadata?.unread === true

  const corner = cornerDateLabel(deal)

  const assigneeInitial = deal.assignedToName?.trim()
    ? deal.assignedToName.trim().charAt(0).toUpperCase()
    : null

  if (overlay) {
    cardClasses += " cursor-grabbing shadow-2xl scale-105 rotate-2 z-50 ring-2 ring-[#00D28B]/20"
  } else if (isDragging) {
    cardClasses += " opacity-30 grayscale"
  } else {
    cardClasses += " cursor-grab active:cursor-grabbing"
  }

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const cardHintTitle =
    deal.stage === "pending_approval"
      ? isManager
        ? "Approve or reject on this card, or open job for details"
        : "Open job — managers approve or reject completion in the job details"
      : overdueStyling.badgeText
        ? "Open job — overdue can be reconciled from job details"
        : undefined

  const handleApproveKanban = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setApprovalBusy(true)
    try {
      const result = await approveCompletion(deal.id)
      if (result.success) {
        toast.success("Job approved and marked completed")
        setPendingApprovalActionsOpen(false)
        onDecisionApplied?.({ type: "approve_completion" })
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to approve")
      }
    } catch {
      toast.error("Failed to approve")
    } finally {
      setApprovalBusy(false)
    }
  }

  const handleApproveDraft = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setApprovalBusy(true)
    try {
      const result = await approveDraft(deal.id)
      if (result.success) {
        toast.success("Draft approved")
        setPendingApprovalActionsOpen(false)
        onDecisionApplied?.({ type: "approve_draft" })
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to approve draft")
      }
    } catch {
      toast.error("Failed to approve draft")
    } finally {
      setApprovalBusy(false)
    }
  }

  const submitRejectKanban = async () => {
    setApprovalBusy(true)
    try {
      const result = showDraftApproval
        ? await rejectDraft(deal.id, rejectReason.trim() || undefined)
        : await rejectCompletion(deal.id, rejectReason.trim() || undefined)
      if (result.success) {
        toast.success(showDraftApproval ? "Draft rejected and moved to Deleted." : "Completion rejected. The job was sent back for editing.")
        setRejectDialogOpen(false)
        setRejectReason("")
        setPendingApprovalActionsOpen(false)
        onDecisionApplied?.(
          showDraftApproval
            ? { type: "reject_draft", reason: rejectReason.trim() || undefined }
            : { type: "reject_completion", reason: rejectReason.trim() || undefined }
        )
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to reject")
      }
    } catch {
      toast.error("Failed to reject")
    } finally {
      setApprovalBusy(false)
    }
  }

  /** Tooltip for the overlapping status strip (3C). */
  const statusBannerTitle =
    overdueStyling.badgeText
      ? overdueStyling.badgeTitle || "Open job for details"
      : statusLabel === "Urgent" || statusLabel === "Follow up"
        ? "Based on time since last activity on this deal — not the same as a past scheduled job date"
        : statusLabel

  /** Left side only — under the 3C overlay (tint + label may cover this). */
  const footerPriceLeftOnly = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs font-bold text-primary leading-none">
        $ {deal.invoicedAmount !== undefined ? deal.invoicedAmount.toLocaleString() : deal.value.toLocaleString()}
      </span>
      {assigneeInitial ? (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-primary/10 text-[10px] font-bold text-primary"
          title={deal.assignedToName ?? "Assigned"}
        >
          {assigneeInitial}
        </div>
      ) : (
        <span className="min-w-[1.25rem] text-[10px] font-medium text-muted-foreground leading-none">-</span>
      )}
    </div>
  )

  const footerTrashButton =
    onDelete && !overlay ? (
      <button
        type="button"
        data-no-card-click
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDelete()
        }}
        className="shrink-0 py-1 pl-1 text-muted-foreground transition-colors hover:text-destructive"
        title="Move to Deleted"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    ) : null

  /** Left edge lines up with body-row icons (px-3), not the text after icon+gap. */
  const footerBaseRow = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      {footerPriceLeftOnly}
      {footerTrashButton}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group touch-none w-full min-w-0"
      data-kanban-card="true"
    >
      {/* Draggable area: whole card. Bin is a sibling so it doesn't start drag. Activation distance (in Kanban) turns small moves into click. */}
      <div
        className={cn(
          "relative flex min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden",
          cardClasses
        )}
        title={cardHintTitle}
        {...(!overlay ? { ...attributes, ...listeners } : {})}
        onPointerDown={() => {
          if (overlay || selectionMode || !onEnterSelectionMode) return
          clearLongPressTimer()
          longPressTimerRef.current = setTimeout(() => {
            onEnterSelectionMode(deal.id)
            longPressTimerRef.current = null
          }, 450)
        }}
        onPointerUp={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-card-click]')) return
          if (selectionMode && onToggleSelected) {
            onToggleSelected(deal.id, !isSelected)
            return
          }
          if (onOpenModal) onOpenModal()
          else if (deal.contactId) router.push(`/crm/contacts/${deal.contactId}`)
          else router.push(`/crm/deals/${deal.id}`)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (onOpenModal) onOpenModal()
            else if (deal.contactId) router.push(`/crm/contacts/${deal.contactId}`)
            else router.push(`/crm/deals/${deal.id}`)
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Main fields — no flex-1 (avoids empty white band between body and footer). */}
        <div className="flex shrink-0 flex-col px-3 pt-2">
          <div className="flex flex-col gap-2 pt-0">
            <div className="flex w-full min-w-0 shrink-0 items-center gap-1.5">
              {!overlay && selectionMode && onToggleSelected && (
                <Checkbox
                  checked={isSelected}
                  aria-label={`Select ${deal.title}`}
                  className="shrink-0"
                  onCheckedChange={(checked) => onToggleSelected(deal.id, checked === true)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              )}
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <HoverScrollName text={deal.contactName || "No name"} />
              <div
                className="flex shrink-0 flex-col items-end gap-0.5 pl-1 text-right"
                data-no-card-click={selectionMode ? true : undefined}
              >
                <span
                  className="text-[10px] font-medium tabular-nums text-muted-foreground"
                  title={corner.text ? corner.title : "No date"}
                >
                  {corner.text || "-"}
                </span>
              </div>
            </div>
            <div className="flex min-h-0 items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span
                className="min-w-0 truncate text-[10.5px] leading-tight text-muted-foreground"
                title={deal.address || "No address"}
              >
                {deal.address || "-"}
              </span>
            </div>
            <div className="flex min-h-0 items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span
                className="min-w-0 truncate text-[11px] font-medium leading-tight text-muted-foreground"
                title={deal.title}
              >
                {deal.title}
              </span>
              {isUnread && (
                <span
                  className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary shadow-[0_0_8px_rgba(0,210,139,0.6)]"
                  title="Unread messages"
                />
              )}
            </div>
            <div className="flex min-h-0 items-center gap-2" data-no-card-click>
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {onAssign && teamMembers.length > 0 && !overlay ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="min-w-0 truncate text-left text-[10px] text-muted-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {deal.assignedToName ?? "-"}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const requiresAssignment = ["scheduled", "ready_to_invoice", "completed"].includes(
                        columnId || ""
                      )
                      return requiresAssignment ? (
                        <DropdownMenuItem disabled className="cursor-not-allowed text-muted-foreground">
                          Cannot unassign (move to earlier stage first)
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onAssign(null)}>Unassign</DropdownMenuItem>
                      )
                    })()}
                    {teamMembers.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => onAssign(m.id)}>
                        {m.name || m.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                  {deal.assignedToName ?? "-"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3C footer: dollar left-aligned with row icons (same px-3 inset as MapPin/Briefcase/User) */}
        <div
          className={cn(
            "relative mt-1 flex shrink-0 flex-col overflow-hidden rounded-b-lg border-t border-border/10",
            showBannerActions && "min-h-0"
          )}
        >
          {showStatusBanner ? (
            <div className="relative z-0 h-9">
              <div className="relative z-0 flex h-9 items-center gap-2 px-3 py-1">
                {footerBaseRow}
              </div>
              <div
                className={cn(
                  "absolute inset-0 z-[1] flex flex-col items-center justify-center rounded-b-lg",
                  showBannerActions ? "cursor-pointer" : "pointer-events-none"
                )}
                title={statusBannerTitle}
                data-no-card-click={showBannerActions ? true : undefined}
                onPointerDown={(e) => {
                  if (!showBannerActions) return
                  e.stopPropagation()
                }}
                onPointerUp={(e) => {
                  if (!showBannerActions) return
                  if (e.pointerType === "mouse") return
                  e.stopPropagation()
                  setPendingApprovalActionsOpen((current) => !current)
                }}
                onClick={(e) => {
                  if (!showBannerActions) return
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseLeave={() => {
                  if (showBannerActions) setPendingApprovalActionsOpen(false)
                }}
              >
                <div className={cn("absolute inset-0 rounded-b-lg shadow-inner", overlayBannerClass)} />
                <div
                  className={cn(
                    "relative z-[2] flex min-w-0 max-w-[min(100%,12rem)] items-center justify-center gap-1 px-2 text-center text-[10px] font-bold uppercase leading-none tracking-wide text-white drop-shadow-md transition-opacity duration-150",
                    showBannerActions && (pendingApprovalActionsOpen
                      ? "opacity-0"
                      : "opacity-100 group-hover:opacity-0")
                  )}
                >
                  {overdueStyling.badgeText ? (
                    <>
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{overlayLabel}</span>
                    </>
                  ) : (
                    <span className="truncate">{overlayLabel}</span>
                  )}
                </div>
                {showBannerActions && (
                  <div
                    className={cn(
                      "absolute inset-0 z-[3] flex items-center justify-center gap-2 px-2 transition-opacity duration-150",
                      pendingApprovalActionsOpen
                        ? "opacity-100 pointer-events-auto"
                        : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                    )}
                    data-no-card-click
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                  >
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700"
                      disabled={approvalBusy}
                      onClick={showDraftApproval ? handleApproveDraft : handleApproveKanban}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 border-amber-200 bg-white/95 px-2.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50"
                      disabled={approvalBusy}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setRejectDialogOpen(true)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative flex h-9 items-center gap-2 bg-muted/15 px-3 py-1 dark:bg-muted/25">
              {footerBaseRow}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open)
          if (!open) {
            setRejectReason("")
            setPendingApprovalActionsOpen(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{showDraftApproval ? "Reject draft?" : "Reject completion?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {showDraftApproval
                ? "The draft will be moved to Deleted so it no longer clutters the active board. You can add an optional note for the audit trail."
                : "The job will be sent back so your team can edit it. You can add an optional note for them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approvalBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={approvalBusy}
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => void submitRejectKanban()}
            >
              {showDraftApproval ? "Reject draft" : "Reject & send back"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stale Job Reconciliation Modal */}
      {showReconciliationModal && (
        <StaleJobReconciliationModal
          deal={deal}
          onClose={() => setShowReconciliationModal(false)}
          onSuccess={() => {
            setShowReconciliationModal(false)
            // Trigger a refresh of the deals data internally
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
