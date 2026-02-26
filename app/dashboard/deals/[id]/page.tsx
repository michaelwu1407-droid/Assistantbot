import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Edit, MessageSquare, FileText, MapPin, DollarSign, Briefcase, ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DealNotes } from "@/components/crm/deal-notes"
import { DealPhotosUpload } from "@/components/crm/deal-photos-upload"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Scheduled",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to be invoiced",
  WON: "Completed",
  LOST: "Lost",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params

  const deal = await db.deal.findUnique({
    where: { id },
    include: { contact: true, jobPhotos: { orderBy: { createdAt: "desc" } } },
  })

  if (!deal) notFound()

  const contactDeals = await db.deal.findMany({
    where: { contactId: deal.contactId, id: { not: id } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { contact: true },
  })

  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const stageLabel = STAGE_LABELS[deal.stage] ?? deal.stage

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/deals/${id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Main: LHS (contact + job) | RHS (history + notes) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: Contact + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
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
                  Contact them
                </Button>
              </Link>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0">
              <div className="border-b md:border-b-0 md:border-r border-slate-100 flex flex-col min-h-0">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">Past jobs</p>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {contactDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No other jobs with this customer.</p>
                  ) : (
                    contactDeals.map((d) => (
                      <Link
                        key={d.id}
                        href={`/dashboard/deals/${d.id}`}
                        className="block p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-900">{d.title}</span>
                        <span className="text-slate-500 ml-2">${Number(d.value || 0).toLocaleString()}</span>
                        <span className="text-slate-400 text-xs block mt-0.5">{STAGE_LABELS[d.stage] ?? d.stage} • {format(new Date(d.updatedAt), "MMM d")}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-col min-h-0">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">Notes</p>
                <div className="flex-1 overflow-y-auto p-3">
                  <DealNotes dealId={deal.id} initialNotes={notes} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos / Activity as tabs if we keep them – optional secondary row or modal */}
      <div className="shrink-0">
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="h-9">
            <TabsTrigger value="photos" className="gap-2 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              Photos {deal.jobPhotos?.length ? `(${deal.jobPhotos.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="photos" className="mt-2">
            <DealPhotosUpload dealId={deal.id} initialPhotos={deal.jobPhotos ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
