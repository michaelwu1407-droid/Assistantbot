import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit, Mail, Phone } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
    const { id } = await params

    const contact = await db.contact.findUnique({
        where: { id },
        include: { deals: { take: 5, orderBy: { createdAt: 'desc' } } }
    })

    if (!contact) {
        notFound()
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                </a>
                            )}
                            {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left: Deals */}
                <div className="space-y-4 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-slate-900">Associated Deals ({contact.deals.length})</h3>
                    {contact.deals.length === 0 ? (
                        <p className="text-slate-500 text-sm">No deals yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {contact.deals.map(deal => (
                                <Link
                                    key={deal.id}
                                    href={`/dashboard/deals/${deal.id}`}
                                    className="block p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{deal.title}</p>
                                            <p className="text-xs text-slate-500">{contact.company || 'No company'}</p>
                                        </div>
                                        <Badge variant="outline">{deal.stage}</Badge>
                                    </div>
                                    <p className="text-sm text-emerald-600 font-medium mt-2">
                                        ${Number(deal.value).toLocaleString()}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Activity */}
                <div className="h-full overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                    <div className="p-4 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50">
                        Activity History
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ActivityFeed contactId={contact.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
