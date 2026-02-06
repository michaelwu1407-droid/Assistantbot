"use server"

import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { BuyerMatchmaker } from "@/components/agent/buyer-matchmaker"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit, ExternalLink } from "lucide-react"
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

    const metadata = deal.metadata as Record<string, unknown> || {}
    const isRealEstate = !!metadata.bedrooms || !!metadata.address

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
                            {deal.company || deal.contact.company} •
                            <span className="text-emerald-600 font-medium">${deal.value.toLocaleString()}</span>
                            {isRealEstate && typeof metadata.address === 'string' && ` • ${metadata.address}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    {isRealEstate && (
                        <Link
                            href={`/kiosk/open-house?dealId=${deal.id}`}
                            target="_blank"
                            className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-10 px-4 py-2 bg-slate-100 text-slate-900 hover:bg-slate-200/80 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Kiosk Mode
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left Column: Matchmaker & Details */}
                <div className="space-y-6 overflow-y-auto pr-2">
                    {/* Only show Matchmaker for "Real Estate" deals (or if they have price/beds) */}
                    {isRealEstate ? (
                        <div className="h-[400px]">
                            <BuyerMatchmaker dealId={deal.id} />
                        </div>
                    ) : (
                        <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 text-center text-slate-500">
                            <p>Buyer matching is available for Real Estate listings with Price/Bed metadata.</p>
                        </div>
                    )}

                    {/* Debug/Meta Info */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-400 font-mono">
                        <p>ID: {deal.id}</p>
                        <p>Created: {deal.createdAt.toLocaleDateString()}</p>
                        <pre className="mt-2 text-[10px] overflow-auto">
                            {JSON.stringify(deal.metadata, null, 2)}
                        </pre>
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
