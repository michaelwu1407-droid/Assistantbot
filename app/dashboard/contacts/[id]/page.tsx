import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ContactNotes } from "@/components/crm/contact-notes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit, Mail, Phone, Building, MapPin, MessageSquare, FileText, Briefcase } from "lucide-react"
import Link from "next/link"
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

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params

  const contact = await db.contact.findUnique({
    where: { id },
    include: { deals: { orderBy: { createdAt: "desc" } } },
  })

  if (!contact) notFound()

  const metadata = (contact.metadata as Record<string, unknown>) ?? {}
  const contactType = (metadata.contactType as string) === "BUSINESS" ? "BUSINESS" : "PERSON"
  const notes = (metadata.notes as string) ?? ""
  const [currentDeal, ...pastDeals] = contact.deals

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
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
        <Button variant="outline" asChild>
          <Link href={`/dashboard/contacts/${id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-y-auto">
        {/* Left: Contact/Business details + Current job */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {contactType === "BUSINESS" ? (
            <div className="p-4 border border-slate-200 dark:border-border rounded-xl bg-white dark:bg-card shadow-sm shrink-0">
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
            <div className="p-4 border border-slate-200 dark:border-border rounded-xl bg-white dark:bg-card shadow-sm shrink-0">
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
            <div className="p-4 border border-slate-200 dark:border-border rounded-xl bg-white dark:bg-card shadow-sm shrink-0">
              <h3 className="font-semibold text-slate-900 dark:text-foreground mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Current job
              </h3>
              <div className="space-y-2.5 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Job</p>
                  <p className="font-medium text-slate-900 dark:text-foreground">{currentDeal.title}</p>
                </div>
                {contactType === "BUSINESS" && (currentDeal.address || (currentDeal.metadata as Record<string, unknown>)?.address) && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500 text-xs">Job address</p>
                      <p className="font-medium text-slate-900 dark:text-foreground">
                        {currentDeal.address || String((currentDeal.metadata as Record<string, unknown>)?.address ?? "")}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 text-xs">Value</p>
                  <p className="font-medium text-emerald-600">${Number(currentDeal.value).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Stage</p>
                  <Badge variant="outline" className="text-xs">{STAGE_LABELS[currentDeal.stage] ?? currentDeal.stage}</Badge>
                </div>
              </div>
              <Link
                href={`/dashboard/deals/${currentDeal.id}`}
                className="inline-block mt-2 text-xs text-blue-600 hover:underline"
              >
                Open job →
              </Link>
            </div>
          )}
        </div>

        {/* Right: Past jobs + Notes */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0 border border-slate-200 dark:border-border rounded-xl bg-white dark:bg-card flex flex-col overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-100 dark:border-border font-semibold text-slate-900 dark:text-foreground bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Past jobs & notes
              </span>
              <Link href={`/dashboard/inbox?contact=${id}`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <MessageSquare className="w-3 h-3" />
                  Contact them
                </Button>
              </Link>
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
                        href={`/dashboard/deals/${d.id}`}
                        className="block p-2 rounded-lg border border-slate-100 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 text-sm"
                      >
                        <span className="font-medium text-slate-900 dark:text-foreground">{d.title}</span>
                        <span className="text-slate-500 ml-2">${Number(d.value).toLocaleString()}</span>
                        <span className="text-slate-400 text-xs block mt-0.5">{STAGE_LABELS[d.stage] ?? d.stage} • {format(new Date(d.updatedAt), "MMM d")}</span>
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
