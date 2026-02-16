import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic";
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
    const { id } = await params

    const deal = await db.deal.findUnique({
        where: { id },
        include: { contact: true }
    })

    if (!deal) {
        notFound()
    }

    const metadata = (deal.metadata || {}) as Record<string, unknown>
    const contact = deal.contact

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
                            <Badge variant="outline" className="uppercase text-xs tracking-wider font-semibold">
                                {deal.stage}
                            </Badge>
                        </div>
                        <p className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                            {contact?.company || 'No company'} •
                            <span className="text-emerald-600 font-medium">${Number(deal.value).toLocaleString()}</span>
                            {typeof metadata.address === 'string' && metadata.address && ` • ${metadata.address}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left Column: Contact Info */}
                <div className="space-y-6 overflow-y-auto pr-2">
                    {/* Contact Details Card */}
                    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-4">Contact Details</h3>
                        {contact ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-slate-500">Name</p>
                                    <p className="font-medium text-slate-900">{contact.name}</p>
                                </div>
                                {contact.email && (
                                    <div>
                                        <p className="text-sm text-slate-500">Email</p>
                                        <p className="font-medium text-slate-900">{contact.email}</p>
                                    </div>
                                )}
                                {contact.phone && (
                                    <div>
                                        <p className="text-sm text-slate-500">Phone</p>
                                        <p className="font-medium text-slate-900">{contact.phone}</p>
                                    </div>
                                )}
                                {contact.company && (
                                    <div>
                                        <p className="text-sm text-slate-500">Company</p>
                                        <p className="font-medium text-slate-900">{contact.company}</p>
                                    </div>
                                )}
                                {typeof metadata.address === 'string' && metadata.address && (
                                    <div>
                                        <p className="text-sm text-slate-500">Address</p>
                                        <p className="font-medium text-slate-900">{metadata.address}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500">No contact associated with this deal.</p>
                        )}
                    </div>

                    {/* Deal Details Card */}
                    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-4">Job Details</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-slate-500">Value</p>
                                <p className="font-medium text-emerald-600">${Number(deal.value).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Stage</p>
                                <p className="font-medium text-slate-900 capitalize">{deal.stage.toLowerCase()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Created</p>
                                <p className="font-medium text-slate-900">{deal.createdAt.toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity Feed */}
                <div className="h-full overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                    <div className="select-none p-4 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50">
                        Activity History
                    </div>
                    <div className="flex-1 overflow-hidden p-0">
                        <ActivityFeed dealId={deal.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
