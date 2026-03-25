"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealNotes } from "@/components/crm/deal-notes"
import { StaleJobReconciliationModal } from "@/components/crm/stale-job-reconciliation-modal"
import { Edit, MessageSquare, FileText, MapPin, DollarSign, Briefcase, AlertTriangle, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { updateDeal, approveCompletion, rejectCompletion, updateDealStage, type DealView } from "@/actions/deal-actions"
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
  KANBAN_STAGE_PICKER_OPTIONS,
  prismaStageToKanbanColumn,
  PRISMA_STAGE_LABELS,
} from "@/lib/deal-utils"
import { kanbanStageRequiresScheduledDate } from "@/lib/deal-stage-rules"

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
  jobPhotos: Array<{ id: string; url?: string; fileUrl?: string; caption?: string | null }>
  // API route stringifies dates; keep flexible in UI.
  scheduledAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  stageChangedAt?: unknown
  lastActivityDate?: unknown
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
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col p-0 gap-0" aria-describedby={undefined}>
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
  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const isManager = currentUserRole === "OWNER" || currentUserRole === "MANAGER"
  const isPendingApproval = deal.stage === "PENDING_COMPLETION"
  const isRejected = !!(metadata.completionRejectedAt || metadata.completionRejectionReason)

  const [overdueDismissed, setOverdueDismissed] = useState(false)
  const [showReconcile, setShowReconcile] = useState(false)

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
    router.push(`/crm/deals/${deal.id}`)
  }

  const handleEditContact = () => {
    if (!contact?.id) {
      toast.error("No contact to edit")
      return
    }
    onOpenChange(false)
    router.push(`/crm/contacts/${contact.id}`)
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
      await updateDeal(deal.id, { invoicedAmount: isNaN(val) ? null : val })
      toast.success("Invoice amount updated")
      setIsEditingInvoice(false)
      setDeal((d) => ({ ...d, invoicedAmount: isNaN(val) ? undefined : val }))
    } catch {
      toast.error("Failed to update invoice amount")
    } finally {
      setSavingInvoice(false)
    }
  }

  const handleConfirmDraft = async () => {
    try {
      await updateDeal(deal.id, { isDraft: false })
      toast.success("Job confirmed")
      setDeal((d) => ({ ...d, isDraft: false }))
      onOpenChange(false)
      onDealUpdated?.()
    } catch {
      toast.error("Failed to confirm job")
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
                    {PRISMA_STAGE_LABELS[deal.stage] ?? deal.stage}
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
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleEdit}>
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
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <FileText className="h-4 w-4" />
                Contact details
              </h3>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleEditContact}>
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
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Briefcase className="h-4 w-4" />
                Current job
              </h3>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleEdit}>
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
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
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
                  {deal.scheduledAt ? format(new Date(deal.scheduledAt), "MMM d, yyyy h:mm a") : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Created</p>
                <p className="font-medium text-slate-900">{format(new Date(deal.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: History + Notes */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Customer / job history */}
          <div className="flex-1 min-h-0 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Customer & job history
              </span>
              <Link href={`/crm/inbox?contact=${deal.contactId}`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <MessageSquare className="w-3 h-3" />
                  Contact them
                </Button>
              </Link>
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
                          window.location.href = `/crm/deals/${d.id}`
                        }}
                        className="block w-full text-left p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-900">{d.title}</span>
                        {d.value != null && <span className="text-slate-500 ml-2">${Number(d.value).toLocaleString()}</span>}
                        <span className="text-slate-400 text-xs block mt-0.5">
                          {PRISMA_STAGE_LABELS[d.stage] ?? d.stage} •{" "}
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
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (!val) return;
                            if (!deal.contactId) {
                              toast.error("No contact to message")
                              return
                            }
                            e.currentTarget.value = '';
                            const { sendSMS } = await import("@/actions/messaging-actions");
                            const res = await sendSMS(deal.contactId, val, deal.id);
                            if (res.success) toast.success("Message sent");
                            else toast.error(res.error || "Failed to send");
                          }
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-primary hover:bg-primary/10" aria-label="Send quick update">
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
              <div key={photo.id} className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
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
