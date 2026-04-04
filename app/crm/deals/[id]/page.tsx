import { db } from "@/lib/db"
import { requireDealInCurrentWorkspace } from "@/lib/workspace-access"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Edit, MessageSquare, FileText, MapPin, Briefcase, ImageIcon, Home, DollarSign, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DealNotes } from "@/components/crm/deal-notes"
import { DealPhotosUpload } from "@/components/crm/deal-photos-upload"
import { JobBillingTab } from "@/components/tradie/job-billing-tab"
import { format } from "date-fns"
import { PRISMA_STAGE_LABELS } from "@/lib/deal-utils"
import { formatDateTimeInTimezone, resolveWorkspaceTimezone } from "@/lib/timezone"

export const dynamic = "force-dynamic"

function stageToVariant(stage: string): "new" | "quote" | "scheduled" | "awaiting" | "complete" | "default" {
  const map: Record<string, "new" | "quote" | "scheduled" | "awaiting" | "complete"> = {
    NEW: "new",
    CONTACTED: "quote",
    NEGOTIATION: "scheduled",
    SCHEDULED: "scheduled",
    PIPELINE: "quote",
    INVOICED: "awaiting",
    WON: "complete",
    LOST: "complete",
  }
  return map[stage] ?? "default"
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params
  let actor: Awaited<ReturnType<typeof requireDealInCurrentWorkspace>>["actor"]
  try {
    ;({ actor } = await requireDealInCurrentWorkspace(id))
  } catch (error) {
    if (error instanceof Error && error.message === "Deal not found") {
      notFound()
    }
    throw error
  }

  const [deal, workspace] = await Promise.all([
    db.deal.findFirst({
      where: { id, workspaceId: actor.workspaceId },
      include: { contact: true, jobPhotos: { orderBy: { createdAt: "desc" } }, syncIssues: { where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 10 } },
    }),
    db.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: { workspaceTimezone: true },
    }),
  ])

  if (!deal) notFound()
  const workspaceTimezone = resolveWorkspaceTimezone(workspace?.workspaceTimezone)
  const isRestrictedActor = actor.role === "TEAM_MEMBER"

  const contactDeals = await db.deal.findMany({
    where: {
      contactId: deal.contactId,
      workspaceId: actor.workspaceId,
      id: { not: id },
      ...(isRestrictedActor ? { assignedToId: actor.id } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: { contact: true },
  })

  const metadata = (deal.metadata || {}) as Record<string, unknown>
  const notes = (metadata.notes as string) || ""
  const contact = deal.contact
  const stageLabel = PRISMA_STAGE_LABELS[deal.stage] ?? deal.stage
  const sectionCardClass = "rounded-lg border border-slate-200 bg-white shadow-sm"
  const topSectionMinHeightClass = "min-h-[16rem] md:min-h-[18rem]"

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/crm/dashboard" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="text-slate-600">Jobs</span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-900">{deal.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/crm/dashboard"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{deal.title}</h1>
              <Badge variant={stageToVariant(deal.stage)} className="text-xs font-semibold">
                {stageLabel}
              </Badge>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              {contact?.company || "No company"} - <span className="text-emerald-600 font-medium">${Number(deal.value || 0).toLocaleString("en-AU")}</span>
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/crm/deals/${id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Main: LHS (contact + job) | RHS (history + notes) */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Left: Contact + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Contact details */}
          <div className={`${sectionCardClass} ${topSectionMinHeightClass} p-4`}>
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
                    <a href={`tel:${contact.phone}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      {contact.phone}
                    </a>
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
          <div className={`${sectionCardClass} ${topSectionMinHeightClass} p-4`}>
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
                <p className="font-medium text-emerald-600">${Number(deal.value || 0).toLocaleString("en-AU")}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Scheduled</p>
                <p className="font-medium text-slate-900">
                  {deal.scheduledAt ? formatDateTimeInTimezone(deal.scheduledAt, workspaceTimezone) : "Not scheduled"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Created</p>
                <p className="font-medium text-slate-900">{format(new Date(deal.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>
          </div>

          {/* Sync issues */}
          {deal.syncIssues && deal.syncIssues.length > 0 && (
            <div className="min-h-[12rem] rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Sync issues ({deal.syncIssues.length})
              </h3>
              <div className="space-y-2">
                {deal.syncIssues.map((issue) => (
                  <div key={issue.id} className="p-2.5 border border-amber-200 dark:border-amber-900/50 rounded-md bg-white/60 dark:bg-black/20 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300 h-5 px-1.5 py-0 font-mono">
                        {issue.surface.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {format(new Date(issue.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: History + Notes */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Customer / job history */}
          <div className={`${sectionCardClass} min-h-[20rem] md:min-h-[24rem] flex flex-col overflow-hidden`}>
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
            <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-2">
              <div className="flex min-h-[12rem] flex-col border-b border-slate-100 md:min-h-[20rem] md:border-b-0 md:border-r">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">Past jobs</p>
                <div className="flex-1 p-3 space-y-2">
                  {contactDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No other jobs with this customer.</p>
                  ) : (
                    contactDeals.map((d) => (
                      <Link
                        key={d.id}
                        href={`/crm/deals/${d.id}`}
                        className="block p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-900">{d.title}</span>
                        <span className="text-slate-500 ml-2">${Number(d.value || 0).toLocaleString("en-AU")}</span>
                        <span className="text-slate-400 text-xs block mt-0.5">{PRISMA_STAGE_LABELS[d.stage] ?? d.stage} - {format(new Date(d.updatedAt), "MMM d")}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="flex min-h-[12rem] flex-col md:min-h-[20rem]">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100">Notes</p>
                <div className="flex-1 p-3">
                  <DealNotes dealId={deal.id} initialNotes={notes} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing + Photos as tabs */}
      <div className="shrink-0">
        <Tabs defaultValue="billing" className="w-full">
          <TabsList className="h-9">
            <TabsTrigger value="billing" className="gap-2 text-xs">
              <DollarSign className="w-3.5 h-3.5" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              Photos {deal.jobPhotos?.length ? `(${deal.jobPhotos.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="billing" className="mt-2">
            <JobBillingTab dealId={deal.id} />
          </TabsContent>
          <TabsContent value="photos" className="mt-2">
            <DealPhotosUpload dealId={deal.id} initialPhotos={deal.jobPhotos ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
