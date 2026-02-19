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

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Scheduled",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to be invoiced",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted jobs",
}

interface DealDetailModalProps {
  dealId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealDetailModal({ dealId, open, onOpenChange }: DealDetailModalProps) {
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
        {!loading && !error && deal && <DealDetailContent deal={deal} contactDeals={contactDeals} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

function DealDetailContent({ deal, contactDeals, onOpenChange }: { deal: any; contactDeals: any[]; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const stageLabel = STAGE_LABELS[deal.stage] ?? deal.stage

  const handleEdit = () => {
    onOpenChange(false)
    router.push(`/dashboard/deals/${deal.id}`)
  }

  return (
    <>
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
                  <p className="text-slate-500 text-xs">Value</p>
                  <p className="font-medium text-emerald-600">${Number(deal.value || 0).toLocaleString()}</p>
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
                    Quick reply
                  </Button>
                </Link>
              </div>
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0">
                <div className="border-b md:border-b-0 md:border-r border-slate-100 flex flex-col min-h-0">
                  <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">This job</p>
                  <div className="flex-1 overflow-y-auto">
                    <ActivityFeed dealId={deal.id} />
                  </div>
                </div>
                <div className="flex flex-col min-h-0">
                  <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">Prior jobs with customer</p>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {contactDeals.length === 0 ? (
                      <p className="text-slate-500 text-sm">No other jobs with this customer.</p>
                    ) : (
                      contactDeals.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            // Could open another modal or navigate
                            window.location.href = `/dashboard/deals/${d.id}`
                          }}
                          className="block w-full text-left p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
                        >
                          <span className="font-medium text-slate-900">{d.title}</span>
                          <span className="text-slate-500 ml-2">${Number(d.value || 0).toLocaleString()}</span>
                          <span className="text-slate-400 text-xs block mt-0.5">{STAGE_LABELS[d.stage] ?? d.stage} • {format(new Date(d.updatedAt), "MMM d")}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes – bottom RHS */}
            <div className="shrink-0 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <DealNotes dealId={deal.id} initialNotes={notes} />
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
