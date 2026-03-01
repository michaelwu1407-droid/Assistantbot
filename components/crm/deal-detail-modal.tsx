"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { DealNotes } from "@/components/crm/deal-notes"
import { Edit, MessageSquare, FileText, MapPin, DollarSign, Briefcase } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { updateDeal, approveCompletion, rejectCompletion } from "@/actions/deal-actions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Scheduled",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to be invoiced",
  PENDING_COMPLETION: "Pending approval",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted jobs",
}

interface DealDetailModalProps {
  dealId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserRole?: string
  onDealUpdated?: () => void
  initialTab?: "activities" | "jobs" | "notes"
}

export function DealDetailModal({ dealId, open, onOpenChange, currentUserRole = "TEAM_MEMBER", onDealUpdated, initialTab }: DealDetailModalProps) {
  const [deal, setDeal] = useState<any>(null)
  const [contactDeals, setContactDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dealId || !open) {
      setDeal(null)
      setContactDeals([])
      setError(null)
      return
    }
    setDeal(null)
    setContactDeals([])
    setError(null)
    setLoading(true)
    fetch(`/api/deals/${dealId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Deal not found" : "Failed to load")
        return res.json()
      })
      .then((data) => {
        setDeal(data.deal)
        setContactDeals(data.contactDeals || [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load")
        setDeal(null)
      })
      .finally(() => setLoading(false))
  }, [dealId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  deal,
  contactDeals,
  onOpenChange,
  currentUserRole,
  onDealUpdated,
  initialTab,
}: {
  deal: any
  contactDeals: any[]
  onOpenChange: (open: boolean) => void
  currentUserRole: string
  onDealUpdated?: () => void
  initialTab?: "activities" | "jobs" | "notes"
}) {
  const router = useRouter()
  const [activeDetailTab, setActiveDetailTab] = useState<"activities" | "jobs" | "notes">(initialTab || "activities")
  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const stageLabel = STAGE_LABELS[deal.stage] ?? deal.stage
  const isManager = currentUserRole === "OWNER" || currentUserRole === "MANAGER"
  const isPendingApproval = deal.stage === "PENDING_COMPLETION"
  const isRejected = !!(metadata.completionRejectedAt || metadata.completionRejectionReason)

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/dashboard/deals/${deal.id}`)
  }

  const [isEditingInvoice, setIsEditingInvoice] = useState(false)
  const [invoiceVal, setInvoiceVal] = useState(deal.invoicedAmount?.toString() || "")
  const [savingInvoice, setSavingInvoice] = useState(false)

  const handleSaveInvoice = async () => {
    setSavingInvoice(true)
    try {
      const val = parseFloat(invoiceVal)
      await updateDeal(deal.id, { invoicedAmount: isNaN(val) ? null : val })
      toast.success("Invoice amount updated")
      setIsEditingInvoice(false)
      deal.invoicedAmount = isNaN(val) ? null : val
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
      deal.isDraft = false
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
        deal.stage = "WON"
        onOpenChange(false)
        onDealUpdated?.()
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to approve")
      }
    } catch {
      toast.error("Failed to approve")
    }
  }

  const handleRejectCompletion = async () => {
    const reason = window.prompt("Rejection reason (optional). The job will be sent back to its previous stage and flagged as rejected.")
    if (reason === null) return
    try {
      const result = await rejectCompletion(deal.id, reason ?? undefined)
      if (result.success) {
        toast.success("Completion rejected. You can edit the job and move it back to Completed when ready.")
        onOpenChange(false)
        onDealUpdated?.()
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to reject")
      }
    } catch {
      toast.error("Failed to reject")
    }
  }

  return (
    <>
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
            <Button size="sm" variant="outline" onClick={handleRejectCompletion} className="border-amber-400 text-amber-800 hover:bg-amber-100">
              <X className="w-4 h-4 mr-1" /> Reject & send back
            </Button>
          </div>
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
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 p-4 md:p-6 border-b">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{deal.title}</h1>
              <Badge variant="outline" className="text-xs tracking-wider font-semibold">
                {stageLabel}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              {contact?.company || "No company"} • <span className="text-emerald-600 font-medium">${Number(deal.value || 0).toLocaleString()}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Main: LHS (contact + job) | RHS (history + notes) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 p-4 md:p-6 overflow-y-auto">
        {/* Left: Contact + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Contact details */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm shrink-0">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contact details
            </h3>
            {contact ? (
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Name</p>
                  <p className="font-medium text-slate-900">{contact.name}</p>
                </div>
                {contact.email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="font-medium text-slate-900">{contact.email}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="font-medium text-slate-900">{contact.phone}</p>
                  </div>
                )}
                {contact.company && (
                  <div>
                    <p className="text-slate-500 text-xs">Company</p>
                    <p className="font-medium text-slate-900">{contact.company}</p>
                  </div>
                )}
                {(deal.address || (typeof metadata.address === "string" && metadata.address)) && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500 text-xs">Address</p>
                      <p className="font-medium text-slate-900">{deal.address || (metadata.address as string)}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No contact associated.</p>
            )}
          </div>

          {/* Current / upcoming job details */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm shrink-0">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Current job
            </h3>
            <div className="space-y-2.5 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Job</p>
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
                        disabled={savingInvoice}
                      />
                    </div>
                    <Button size="sm" onClick={handleSaveInvoice} disabled={savingInvoice} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingInvoice(false)} disabled={savingInvoice}>Cancel</Button>
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
              <Link href={`/dashboard/inbox?contact=${deal.contactId}`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <MessageSquare className="w-3 h-3" />
                  Contact them
                </Button>
              </Link>
            </div>
            <div className="flex bg-slate-100/50 p-1 border-b border-slate-100 shrink-0">
              {["activities", "jobs", "notes"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveDetailTab(t as any)}
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
                <div className="h-full overflow-y-auto p-3 space-y-2">
                  {contactDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No other jobs with this customer.</p>
                  ) : (
                    contactDeals.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onOpenChange(false)
                          window.location.href = `/dashboard/deals/${d.id}`
                        }}
                        className="block w-full text-left p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-900">{d.title}</span>
                        {d.value != null && <span className="text-slate-500 ml-2">${Number(d.value).toLocaleString()}</span>}
                        <span className="text-slate-400 text-xs block mt-0.5">{STAGE_LABELS[d.stage] ?? d.stage} • {format(new Date(d.updatedAt), "MMM d")}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {activeDetailTab === "notes" && (
                <div className="h-full overflow-y-auto p-3">
                  <DealNotes dealId={deal.id} initialNotes={notes} />
                </div>
              )}
              {activeDetailTab === "activities" && (
                <div className="h-full overflow-hidden flex flex-col min-h-0">
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
                            e.currentTarget.value = '';
                            const { sendSMS } = await import("@/actions/messaging-actions");
                            const res = await sendSMS(deal.contactId, val, deal.id);
                            if (res.success) toast.success("Message sent");
                            else toast.error(res.error || "Failed to send");
                          }
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-primary hover:bg-primary/10">
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
            {deal.jobPhotos.map((photo: any) => (
              <div key={photo.id} className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img src={photo.url} alt={photo.caption || "Job"} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
