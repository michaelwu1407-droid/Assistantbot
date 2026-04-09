"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealNotes } from "@/components/crm/deal-notes"
import { StaleJobReconciliationModal } from "@/components/crm/stale-job-reconciliation-modal"
import { Edit, MessageSquare, FileText, MapPin, DollarSign, Briefcase, AlertTriangle, ChevronDown, Bell, BellOff, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { updateDeal, approveCompletion, rejectCompletion, updateDealStage, type DealView } from "@/actions/deal-actions"
import { scheduleFollowUp, completeFollowUp, cancelFollowUp } from "@/actions/followup-actions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getKanbanColumnSwatchClass,
  getKanbanStagePillClasses,
  getOverdueStyling,
  getUserFacingDealStageLabel,
  KANBAN_STAGE_PICKER_OPTIONS,
  prismaStageToKanbanColumn,
} from "@/lib/deal-utils"
import { kanbanStageRequiresScheduledDate } from "@/lib/deal-stage-rules"
import { formatDateTimeInTimezone, resolveWorkspaceTimezone } from "@/lib/timezone"

interface DealDetailModalProps {
  dealId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserRole?: string
  onDealUpdated?: () => void
  initialTab?: "activities" | "jobs" | "notes"
}

type DealDetail = DealView & {
  contact: { id: string; name: string; company?: string | null; email?: string | null; phone?: string | null }
  assignedTo?: { id: string; name: string | null } | null
  workspace?: { workspaceTimezone?: string | null } | null
  jobPhotos: Array<{ id: string; url?: string; fileUrl?: string; caption?: string | null }>
  // API route stringifies dates; keep flexible in UI.
  scheduledAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  stageChangedAt?: unknown
  lastActivityDate?: unknown
  // Follow-up scheduling fields
  followUpAt?: string | null
  followUpNote?: string | null
  followUpChannel?: string | null
  followUpCompletedAt?: string | null
}

type ContactDeal = DealView & { updatedAt?: unknown }

export function DealDetailModal({ dealId, open, onOpenChange, currentUserRole = "TEAM_MEMBER", onDealUpdated, initialTab }: DealDetailModalProps) {
  const [deal, setDeal] = useState<DealDetail | null>(null)
  const [contactDeals, setContactDeals] = useState<ContactDeal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dealId || !open) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    fetch(`/api/deals/${dealId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Deal not found" : "Failed to load")
        return res.json()
      })
      .then((data: unknown) => {
        const parsed = data as { deal?: DealDetail; contactDeals?: DealView[] }
        setDeal(parsed.deal ?? null)
        setContactDeals(Array.isArray(parsed.contactDeals) ? (parsed.contactDeals as ContactDeal[]) : [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load")
        setDeal(null)
      })
      .finally(() => {
        queueMicrotask(() => {
          if (!cancelled) setLoading(false)
        })
      })
    return () => {
      cancelled = true
    }
  }, [dealId, open])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setDeal(null)
          setContactDeals([])
          setError(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden rounded-[18px] flex flex-col p-0 gap-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Deal details</DialogTitle>
        {loading && (
          <div className="flex items-center justify-center flex-1 min-h-[200px]">
            <p className="text-slate-500">Loading...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] gap-2">
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
        {!loading && !error && deal && (
          <DealDetailContent
            key={deal.id}
            deal={deal}
            contactDeals={contactDeals}
            onOpenChange={onOpenChange}
            currentUserRole={currentUserRole}
            onDealUpdated={onDealUpdated}
            initialTab={initialTab}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DealDetailContent({
  deal: initialDeal,
  contactDeals,
  onOpenChange,
  currentUserRole,
  onDealUpdated,
  initialTab,
}: {
  deal: DealDetail
  contactDeals: DealView[]
  onOpenChange: (open: boolean) => void
  currentUserRole: string
  onDealUpdated?: () => void
  initialTab?: "activities" | "jobs" | "notes"
}) {
  const router = useRouter()
  const [deal, setDeal] = useState<DealDetail>(initialDeal)

  const [activeDetailTab, setActiveDetailTab] = useState<"activities" | "jobs" | "notes">(initialTab || "activities")
  const [quickMessage, setQuickMessage] = useState("")
  const [sendingQuickMessage, setSendingQuickMessage] = useState(false)
  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const workspaceTimezone = resolveWorkspaceTimezone(deal.workspace?.workspaceTimezone)
  const isManager = currentUserRole === "OWNER" || currentUserRole === "MANAGER"
  const isPendingApproval = deal.stage === "PENDING_COMPLETION"
  const isRejected = !!(metadata.completionRejectedAt || metadata.completionRejectionReason)

  const [overdueDismissed, setOverdueDismissed] = useState(false)
  const [showReconcile, setShowReconcile] = useState(false)

  // Follow-up scheduling
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(
    deal.followUpAt ? format(new Date(deal.followUpAt), "yyyy-MM-dd'T'HH:mm") : ""
  )
  const [followUpNote, setFollowUpNoteState] = useState(deal.followUpNote || "")
  const [followUpChannel, setFollowUpChannel] = useState(deal.followUpChannel || "sms")
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const followUpAt = deal.followUpAt ?? null
  const followUpCompletedAt = deal.followUpCompletedAt ?? null
  const followUpNoteSaved = deal.followUpNote ?? null

  const overdueStyling = getOverdueStyling({
    stage: deal.stage,
    scheduledAt: deal.scheduledAt ? new Date(deal.scheduledAt) : null,
    actualOutcome: deal.actualOutcome ?? null,
  })

  const [stageChanging, setStageChanging] = useState(false)
  const [liveMessage, setLiveMessage] = useState("")

  const handleStageConflict = (result: { success: boolean; error?: string; code?: string }) => {
    if ((result as { code?: string }).code !== "CONFLICT") return false
    toast.error("This card was moved by someone else. Refreshing board...")
    onOpenChange(false)
    onDealUpdated?.()
    router.refresh()
    return true
  }

  const handleStageChange = async (targetKanban: string) => {
    const currentCol = prismaStageToKanbanColumn(deal.stage)
    if (currentCol === targetKanban) return
    if (targetKanban === "scheduled" && !deal.assignedToId) {
      toast.error("Assign a team member before moving to Scheduled.")
      return
    }
    if (kanbanStageRequiresScheduledDate(targetKanban) && !deal.scheduledAt) {
      toast.error("Set a scheduled date before moving the job to this stage.")
      return
    }
    setStageChanging(true)
    try {
      const result = await updateDealStage(deal.id, targetKanban)
      if (!result.success) {
        if (handleStageConflict(result)) return
        toast.error(result.error ?? "Could not update stage")
        setLiveMessage("Could not update stage.")
        return
      }
      toast.success("Stage updated")
      setLiveMessage("Stage updated.")
      const res = await fetch(`/api/deals/${deal.id}`)
      if (res.ok) {
        const data = await res.json()
        setDeal(data.deal)
      }
      onDealUpdated?.()
      router.refresh()
    } finally {
      setStageChanging(false)
    }
  }

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/crm/deals/${deal.id}/edit`)
  }

  const handleEditContact = () => {
    if (!contact?.id) {
      toast.error("No contact to edit")
      return
    }
    onOpenChange(false)
    router.push(`/crm/contacts/${contact.id}/edit`)
  }

  const [isEditingInvoice, setIsEditingInvoice] = useState(false)
  const [invoiceVal, setInvoiceVal] = useState(deal.invoicedAmount?.toString() || "")
  useEffect(() => {
    setInvoiceVal(deal.invoicedAmount?.toString() || "")
  }, [deal.id, deal.invoicedAmount])
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleSaveInvoice = async (forcedVal?: string) => {
    setSavingInvoice(true)
    try {
      const val = parseFloat(forcedVal ?? invoiceVal)
      const result = await updateDeal(deal.id, { invoicedAmount: isNaN(val) ? null : val })
      if (!result.success) {
        throw new Error(result.error || "Failed to update invoice amount")
      }
      toast.success("Invoice amount updated")
      setIsEditingInvoice(false)
      setDeal((d) => ({ ...d, invoicedAmount: isNaN(val) ? undefined : val }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice amount")
    } finally {
      setSavingInvoice(false)
    }
  }

  const handleConfirmDraft = async () => {
    try {
      const result = await updateDeal(deal.id, { isDraft: false })
      if (!result.success) {
        throw new Error(result.error || "Failed to confirm job")
      }
      toast.success("Job confirmed")
      setDeal((d) => ({ ...d, isDraft: false }))
      onOpenChange(false)
      onDealUpdated?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm job")
    }
  }

  const handleSendQuickUpdate = async () => {
    const message = quickMessage.trim()
    if (!message) return
    if (!deal.contactId) {
      toast.error("No contact to message")
      return
    }

    setSendingQuickMessage(true)
    try {
      const { sendSMS } = await import("@/actions/messaging-actions")
      const res = await sendSMS(deal.contactId, message, deal.id)
      if (!res.success) {
        throw new Error(res.error || "Failed to send")
      }
      setQuickMessage("")
      toast.success("Message sent")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send")
    } finally {
      setSendingQuickMessage(false)
    }
  }

  const handleApproveCompletion = async () => {
    try {
      const result = await approveCompletion(deal.id)
      if (result.success) {
        toast.success("Job approved and marked completed")
        setLiveMessage("Job approved and marked completed.")
        setDeal((d) => ({ ...d, stage: "WON" }))
        onOpenChange(false)
        onDealUpdated?.()
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to approve")
        setLiveMessage("Could not approve completion.")
      }
    } catch {
      toast.error("Failed to approve")
      setLiveMessage("Could not approve completion.")
    }
  }

  const submitReject = async () => {
    try {
      const result = await rejectCompletion(deal.id, rejectReason ?? undefined)
      if (result.success) {
        toast.success("Completion rejected. You can edit the job and move it back to Completed when ready.")
        setLiveMessage("Completion rejected.")
        onOpenChange(false)
        onDealUpdated?.()
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to reject")
        setLiveMessage("Could not reject completion.")
      }
    } catch {
      toast.error("Failed to reject")
      setLiveMessage("Could not reject completion.")
    }
  }

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">{liveMessage}</p>
      {overdueStyling.badgeText && !overdueDismissed && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 text-sm text-white",
            overdueStyling.severity === "critical" && "bg-red-500",
            overdueStyling.severity === "warning" && "bg-orange-500",
            (overdueStyling.severity === "mild" || overdueStyling.severity === "none") && "bg-amber-500"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{overdueStyling.badgeText}</span>
            <span className="truncate opacity-90" title={overdueStyling.badgeTitle}>
              {overdueStyling.badgeTitle || "Past scheduled time with no outcome recorded."}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 bg-white/20 text-white hover:bg-white/30"
              onClick={() => setShowReconcile(true)}
            >
              Reconcile
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
              aria-label="Dismiss overdue warning"
              onClick={() => setOverdueDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {deal.isDraft && (
        <div className="bg-indigo-50 border-b border-indigo-100 p-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <strong>Draft Job:</strong> The AI Agent organized this request. Please confirm to officially book it.
          </div>
          <Button size="sm" onClick={handleConfirmDraft} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Confirm Booking
          </Button>
        </div>
      )}
      {isPendingApproval && isManager && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 shrink-0 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <strong>Pending approval:</strong> A team member moved this to Completed. Approve to confirm, or reject to send it back.
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApproveCompletion} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRejectInput(true)} className="border-amber-400 text-amber-800 hover:bg-amber-100">
              <X className="w-4 h-4 mr-1" /> Reject & send back
            </Button>
          </div>
          {showRejectInput && (
            <div className="flex gap-2 w-full mt-2 items-center">
              <Input placeholder="Rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="h-8 max-w-[300px]" />
              <Button size="sm" onClick={submitReject}>Confirm</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>Cancel</Button>
            </div>
          )}
        </div>
      )}
      {isRejected && !isPendingApproval && (
        <div className="bg-red-50 border-b border-red-200 p-3 shrink-0 flex items-center gap-2 text-red-800 text-sm">
          <span className="flex h-2 w-2 rounded-full bg-red-500" />
          <strong>Completion was rejected.</strong>
          {metadata.completionRejectionReason != null && (
            <span className="text-red-700">Reason: {String(metadata.completionRejectionReason)}</span>
          )}
          <span>Edit the job and move it back to Completed when ready, or a manager can approve from here if it’s pending again.</span>
        </div>
      )}
      {/* Header — Job | Name + stage picker (LHS) + Edit (RHS) */}
      <div className="shrink-0 border-b">
        <div className="flex items-start justify-between gap-4 p-4 md:p-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              <span className="break-words">{deal.title}</span>
              <span className="font-normal text-slate-400"> | </span>
              <span className="font-semibold text-slate-800">{contact?.name ?? "—"}</span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {deal.source ? deal.source.charAt(0).toUpperCase() + deal.source.slice(1) : "—"} •{" "}
              <span className="font-medium text-emerald-600">${Number(deal.value || 0).toLocaleString()}</span>
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
                    getKanbanStagePillClasses(deal.stage)
                  )}
                  disabled={stageChanging}
                >
                  <span className="truncate text-left">
                    {getUserFacingDealStageLabel(deal.stage)}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(100vw-2rem,14rem)]">
                {KANBAN_STAGE_PICKER_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    className="flex items-center gap-2"
                    disabled={stageChanging || prismaStageToKanbanColumn(deal.stage) === opt.id}
                    onClick={() => void handleStageChange(opt.id)}
                  >
                    <span
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getKanbanColumnSwatchClass(opt.id))}
                      aria-hidden
                    />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleEdit} aria-label="Edit job">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Main: LHS (contact + job) | RHS (history + notes) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 p-4 md:p-6 overflow-y-auto">
        {/* Left: Contact + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Contact details — name is in header; edit opens contact */}
          <div className="shrink-0 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <FileText className="h-4 w-4" />
                Contact details
              </h3>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleEditContact} aria-label="Edit contact">
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </div>
            {contact ? (
              <div className="space-y-2.5 text-sm">
                {contact.phone && (
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <a
                      href={`tel:${contact.phone}`}
                      className="mt-0.5 flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <a href={`mailto:${contact.email}`} className="font-medium text-slate-900 hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.company && (
                  <div>
                    <p className="text-xs text-slate-500">Company</p>
                    <p className="font-medium text-slate-900">{contact.company}</p>
                  </div>
                )}
                {(deal.address || (typeof metadata.address === "string" && metadata.address)) && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="font-medium text-slate-900">{deal.address || (metadata.address as string)}</p>
                    </div>
                  </div>
                )}
                {!contact.phone && !contact.email && !contact.company && !deal.address && !(typeof metadata.address === "string" && metadata.address) && (
                  <p className="text-sm text-slate-500">Add phone, email, or address via Edit.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No contact associated.</p>
            )}
          </div>

          {/* Current / upcoming job details */}
          <div className="shrink-0 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Briefcase className="h-4 w-4" />
                Current job
              </h3>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleEdit} aria-label="Edit job">
                <Edit className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </div>
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-xs text-slate-500">Job</p>
                <p className="font-medium text-slate-900">{deal.title}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs text-emerald-600 font-medium mb-1">Final Invoice Amount</p>
                {isEditingInvoice ? (
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-500" />
                      <Input
                        type="number"
                        className="pl-8 h-9 bg-emerald-50/50 border-emerald-200"
                        value={invoiceVal}
                        onChange={(e) => setInvoiceVal(e.target.value)}
                        onBlur={(e) => handleSaveInvoice(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInvoice() }}
                        disabled={savingInvoice}
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-[18px] border border-emerald-100 bg-emerald-50 p-2">
                    <span className="font-semibold text-emerald-700 text-lg">
                      {deal.invoicedAmount !== undefined && deal.invoicedAmount !== null
                        ? `$${deal.invoicedAmount.toLocaleString()}`
                        : "Not set"
                      }
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50" onClick={() => setIsEditingInvoice(true)}>
                      <Edit className="w-3.5 h-3.5 mr-1" /> Set
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-slate-500 text-xs">Quoted Value</p>
                <p className="font-medium text-slate-700">${Number(deal.value || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Scheduled</p>
                <p className="font-medium text-slate-900">
                  {deal.scheduledAt ? formatDateTimeInTimezone(deal.scheduledAt, workspaceTimezone) : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Created</p>
                <p className="font-medium text-slate-900">{format(new Date(deal.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>

            {/* ─── Follow-up Reminder ─────────────────────────────── */}
            <div className="mt-3 rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  Follow-up
                </span>
                {followUpAt && !followUpCompletedAt && (
                  <button
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                    onClick={async () => {
                      await cancelFollowUp(deal.id)
                      setDeal((d) => ({ ...d!, followUpAt: null, followUpNote: null, followUpChannel: null } as DealDetail))
                      setFollowUpDate("")
                      setFollowUpNoteState("")
                      setShowFollowUpForm(false)
                      toast.success("Follow-up cancelled")
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Show existing scheduled follow-up */}
              {followUpAt && !followUpCompletedAt && !showFollowUpForm && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      new Date(followUpAt) < new Date() ? "text-red-600" : "text-slate-900"
                    )}>
                      {new Date(followUpAt) < new Date() ? "⚠ Overdue — " : ""}
                      {format(new Date(followUpAt), "EEE MMM d, h:mm a")}
                    </span>
                  </div>
                  {followUpNoteSaved && (
                    <p className="text-xs text-slate-500">{followUpNoteSaved}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setShowFollowUpForm(true)}
                    >
                      <Edit className="w-3 h-3" /> Reschedule
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={async () => {
                        setSavingFollowUp(true)
                        const result = await completeFollowUp(deal.id, "Marked complete")
                        if (result.success) {
                          setDeal((d) => ({ ...d!, followUpCompletedAt: new Date().toISOString() } as DealDetail))
                          toast.success("Follow-up marked complete")
                          onDealUpdated?.()
                        } else {
                          toast.error(result.error || "Failed")
                        }
                        setSavingFollowUp(false)
                      }}
                      disabled={savingFollowUp}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </Button>
                  </div>
                </div>
              )}

              {/* Completed state */}
              {followUpCompletedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500">
                    Completed {format(new Date(followUpCompletedAt), "MMM d")}
                  </span>
                  <button
                    className="text-[10px] text-primary hover:underline ml-auto"
                    onClick={() => {
                      setDeal((d) => ({ ...d!, followUpCompletedAt: null, followUpAt: null } as DealDetail))
                      setShowFollowUpForm(true)
                    }}
                  >
                    Schedule another
                  </button>
                </div>
              )}

              {/* No follow-up yet */}
              {!followUpAt && !followUpCompletedAt && !showFollowUpForm && (
                <button
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  onClick={() => setShowFollowUpForm(true)}
                >
                  <Bell className="w-3.5 h-3.5" /> Schedule a follow-up reminder
                </button>
              )}

              {/* Follow-up form */}
              {showFollowUpForm && (
                <div className="space-y-2 mt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">When</label>
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Note (optional)</label>
                    <Input
                      value={followUpNote}
                      onChange={(e) => setFollowUpNoteState(e.target.value)}
                      placeholder="What to follow up about..."
                      className="mt-0.5 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Channel</label>
                    <select
                      value={followUpChannel}
                      onChange={(e) => setFollowUpChannel(e.target.value)}
                      className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setShowFollowUpForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!followUpDate || savingFollowUp}
                      onClick={async () => {
                        if (!followUpDate) return
                        setSavingFollowUp(true)
                        const result = await scheduleFollowUp(
                          deal.id,
                          new Date(followUpDate),
                          followUpNote || undefined,
                          followUpChannel || undefined
                        )
                        if (result.success) {
                          setDeal((d) => ({
                            ...d!,
                            followUpAt: new Date(followUpDate).toISOString(),
                            followUpNote: followUpNote || null,
                            followUpChannel: followUpChannel || null,
                            followUpCompletedAt: null,
                          } as DealDetail))
                          setShowFollowUpForm(false)
                          toast.success("Follow-up reminder saved")
                          onDealUpdated?.()
                        } else {
                          toast.error(result.error || "Failed to save")
                        }
                        setSavingFollowUp(false)
                      }}
                    >
                      {savingFollowUp ? "Saving..." : "Save Reminder"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: History + Notes */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Customer / job history */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
            <div className="p-3 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Customer & job history
              </span>
              {deal.contactId ? (
                <Link href={`/crm/inbox?contact=${deal.contactId}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    Open customer timeline
                  </Button>
                </Link>
              ) : (
                <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                  <MessageSquare className="w-3 h-3" />
                  No contact linked
                </Button>
              )}
            </div>
            <div className="border-b border-slate-100 bg-white px-3 py-2 text-xs text-slate-500">
              Recent activity stays here. Open the customer timeline for the full SMS, email, and call correspondence.
            </div>
            <div className="flex bg-slate-100/50 p-1 border-b border-slate-100 shrink-0" role="tablist" aria-label="Deal detail sections">
              {(["activities", "jobs", "notes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveDetailTab(t)}
                  role="tab"
                  aria-selected={activeDetailTab === t}
                  aria-controls={`deal-tab-${t}`}
                  id={`deal-tab-btn-${t}`}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                    activeDetailTab === t ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t === "activities" ? "Communications" : t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {activeDetailTab === "jobs" && (
                <div id="deal-tab-jobs" role="tabpanel" aria-labelledby="deal-tab-btn-jobs" className="h-full overflow-y-auto p-3 space-y-2">
                  {contactDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No other jobs with this customer.</p>
                  ) : (
                    contactDeals.map((d: ContactDeal) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onOpenChange(false)
                          router.push(`/crm/deals/${d.id}`)
                        }}
                        className="block w-full rounded-[18px] border border-slate-100 p-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">{d.title}</span>
                        {d.value != null && <span className="text-slate-500 ml-2">${Number(d.value).toLocaleString()}</span>}
                        <span className="text-slate-400 text-xs block mt-0.5">
                          {getUserFacingDealStageLabel(d.stage)} •{" "}
                          {d.updatedAt ? format(new Date(d.updatedAt as string), "MMM d") : "—"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {activeDetailTab === "notes" && (
                <div id="deal-tab-notes" role="tabpanel" aria-labelledby="deal-tab-btn-notes" className="h-full overflow-y-auto p-3">
                  <DealNotes dealId={deal.id} initialNotes={notes} />
                </div>
              )}
              {activeDetailTab === "activities" && (
                <div id="deal-tab-activities" role="tabpanel" aria-labelledby="deal-tab-btn-activities" className="h-full overflow-hidden flex flex-col min-h-0">
                  <ActivityFeed contactId={deal.contactId} compact className="flex-1" />
                  {/* Direct message mini-box */}
                  <div className="p-3 border-t bg-slate-50/50 shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Send a quick update..."
                        className="bg-white h-9 text-xs"
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            await handleSendQuickUpdate()
                          }
                        }}
                        disabled={sendingQuickMessage}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-primary hover:bg-primary/10"
                        aria-label="Send quick update"
                        onClick={() => void handleSendQuickUpdate()}
                        disabled={sendingQuickMessage || quickMessage.trim().length === 0}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photos section */}
      {deal.jobPhotos && deal.jobPhotos.length > 0 && (
        <div className="shrink-0 p-4 border-t">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {deal.jobPhotos.map((photo) => (
              <div key={photo.id} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                <Image
                  src={photo.url ?? photo.fileUrl ?? ""}
                  alt={photo.caption || "Job"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showReconcile && (
        <StaleJobReconciliationModal
          deal={
            {
              ...deal,
              contactName: contact?.name ?? "",
            } as DealView
          }
          onClose={() => setShowReconcile(false)}
          onSuccess={() => {
            setShowReconcile(false)
            onDealUpdated?.()
            router.refresh()
          }}
        />
      )}
    </>
  )
}
