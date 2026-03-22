import { db } from "@/lib/db"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { notFound } from "next/navigation"
import { ContactNotes } from "@/components/crm/contact-notes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Edit, Mail, Phone, Building, MapPin, MessageSquare, FileText, Briefcase, AlertCircle, Home } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PRISMA_STAGE_LABELS } from "@/lib/deal-utils"

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

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params
  const actor = await requireCurrentWorkspaceAccess()

  const contact = await db.contact.findFirst({
    where: { id, workspaceId: actor.workspaceId },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      customerFeedback: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!contact) notFound()

  const metadata = (contact.metadata as Record<string, unknown>) ?? {}
  const contactType = (metadata.contactType as string) === "BUSINESS" ? "BUSINESS" : "PERSON"
  const notes = (metadata.notes as string) ?? ""
  const [currentDeal, ...pastDeals] = contact.deals

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-4 overflow-hidden">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/crm" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="text-slate-600">Contacts</span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-900">{contact.name}</span>
      </nav>

      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/crm"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{contact.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {contact.email}
                </a>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/crm/contacts/${id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-y-auto">
        {/* Left: Contact/Business details + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {contactType === "BUSINESS" ? (
            <div className="p-4 border border-slate-200 dark:border-border rounded-lg bg-white dark:bg-card shadow-sm shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Business details
              </h3>
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Name</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">{contact.name}</p>
                </div>
                {contact.company && (
                  <div>
                    <p className="text-slate-500 text-xs">Company</p>
                    <p className="font-medium text-slate-900 dark:text-foreground">{contact.company}</p>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="font-medium text-slate-900 dark:text-foreground">{contact.phone}</p>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="font-medium text-slate-900 dark:text-foreground">{contact.email}</p>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500 text-xs">Address</p>
                      <p className="font-medium text-slate-900 dark:text-foreground">{contact.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border border-slate-200 dark:border-border rounded-lg bg-white dark:bg-card shadow-sm shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contact details
              </h3>
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Name</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">{contact.name}</p>
                </div>
                {contact.phone && (
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="font-medium text-slate-900 dark:text-foreground">{contact.phone}</p>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="font-medium text-slate-900 dark:text-foreground">{contact.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentDeal && (
            <div className="p-4 border border-slate-200 dark:border-border rounded-lg bg-white dark:bg-card shadow-sm shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Current job
              </h3>
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Job</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">{currentDeal.title}</p>
                </div>
                {(() => {
                  const hasAddress = currentDeal.address || (currentDeal.metadata as Record<string, unknown>)?.address;
                  if (contactType !== "BUSINESS" || !hasAddress) return null;
                  return (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-500 text-xs">Job address</p>
                        <p className="font-medium text-slate-900 dark:text-foreground">
                          {currentDeal.address || String((currentDeal.metadata as Record<string, unknown>)?.address ?? "")}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <div>
                  <p className="text-slate-500 text-xs">Value</p>
                  <p className="font-medium text-emerald-600">${Number(currentDeal.value).toLocaleString("en-AU")}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Stage</p>
                  <Badge variant={stageToVariant(currentDeal.stage)} className="text-xs">{PRISMA_STAGE_LABELS[currentDeal.stage] ?? currentDeal.stage}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href={`/crm/deals/${currentDeal.id}`}>
                  Open job →
                </Link>
              </Button>
            </div>
          )}

          {contact.customerFeedback && contact.customerFeedback.length > 0 && (
            <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-red-50 dark:bg-red-950/20 shadow-sm shrink-0">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Chatbot feedback
              </h3>
              <div className="space-y-3">
                {contact.customerFeedback.map((fb) => (
                  <details key={fb.id} className="group border border-red-200 dark:border-red-900/50 rounded-md overflow-hidden">
                    <summary className="flex cursor-pointer items-center justify-between p-3 bg-red-100/30 dark:bg-red-900/10 text-sm font-medium text-red-800 dark:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-900/20 list-none">
                      <span className="flex items-center gap-2">
                        {format(new Date(fb.createdAt), "MMM d")} - Score: {fb.score}/10
                        {fb.resolved && <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 h-5 px-1 py-0">Resolved</Badge>}
                      </span>
                      <ChevronLeft className="w-4 h-4 rotate-[-90deg] group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="p-3 text-xs text-red-700 dark:text-red-400 border-t border-red-200 dark:border-red-900/50 bg-white/50 dark:bg-black/20">
                      <div className="bg-red-50/50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 whitespace-pre-wrap font-mono">
                        <p className="font-semibold text-red-900 dark:text-red-300 mb-1 font-sans">Transcript snippet / Comment:</p>
                        {fb.comment || "No transcript available."}
                        {fb.resolution && (
                          <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-900/50">
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1 font-sans">Resolution notes:</p>
                            <p className="font-sans text-slate-700 dark:text-slate-300">{fb.resolution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Past jobs + Notes */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0 border border-slate-200 dark:border-border rounded-lg bg-white dark:bg-card flex flex-col overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-100 dark:border-border font-semibold text-slate-900 dark:text-foreground bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Past jobs & notes
              </span>
              <div className="flex items-center gap-1.5">
                {contact.phone && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2" asChild>
                      <a href={`tel:${contact.phone}`}>
                        <Phone className="w-3 h-3 text-blue-500" /> Call
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2" asChild>
                      <a href={`sms:${contact.phone}`}>
                        <MessageSquare className="w-3 h-3 text-emerald-500" /> Text
                      </a>
                    </Button>
                  </>
                )}
                {contact.email && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="w-3 h-3 text-slate-500" /> Email
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0">
              <div className="border-b md:border-b-0 md:border-r border-slate-100 dark:border-border flex flex-col min-h-0">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100 dark:border-border">Past jobs</p>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(pastDeals.length === 0 && !currentDeal) ? (
                    <p className="text-slate-500 text-sm">No jobs yet.</p>
                  ) : pastDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">No other jobs.</p>
                  ) : (
                    pastDeals.map((d) => (
                      <Link
                        key={d.id}
                        href={`/crm/deals/${d.id}`}
                        className="block p-2 rounded-lg border border-slate-100 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm"
                      >
                        <span className="font-medium text-slate-900 dark:text-foreground">{d.title}</span>
                        <span className="text-slate-500 ml-2">${Number(d.value).toLocaleString("en-AU")}</span>
                        <span className="text-slate-400 text-xs block mt-0.5">{PRISMA_STAGE_LABELS[d.stage] ?? d.stage} • {format(new Date(d.updatedAt), "MMM d")}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-col min-h-0">
                <p className="text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-100 dark:border-border">Notes</p>
                <div className="flex-1 overflow-y-auto p-3">
                  <ContactNotes contactId={contact.id} initialNotes={notes} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
