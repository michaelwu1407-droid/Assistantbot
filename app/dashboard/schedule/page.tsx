import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUser } from "@/lib/auth"
import { getDeals } from "@/actions/deal-actions"
import { Calendar, Clock, MapPin, DollarSign } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    let deals
    try {
        const workspace = await getOrCreateWorkspace(authUser.id)
        deals = await getDeals(workspace.id)
    } catch {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">Could not load schedule. Please try again later.</p>
                </div>
            </div>
        )
    }

    // Group deals by stage for a schedule-like view
    const activeDeals = deals.filter(d => !["won", "lost"].includes(d.stage))
    const today = new Date()
    const todayStr = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-auto">
            <div className="mb-6 shrink-0">
                <div className="flex items-center gap-3 mb-1">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                    <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
                </div>
                <p className="text-sm text-slate-500 ml-9">{todayStr}</p>
            </div>

            {activeDeals.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                            <Calendar className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-700">No active jobs</h3>
                        <p className="text-sm text-slate-500">Create a new deal to see it in your schedule.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeDeals.map((deal) => {
                        const meta = deal.metadata as Record<string, unknown> | undefined
                        const schedule = meta?.schedule as string | undefined
                        const address = deal.address || (meta?.address as string | undefined)

                        return (
                            <Link key={deal.id} href={`/dashboard/deals/${deal.id}`}>
                                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all group cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                                {deal.title}
                                            </h3>
                                            <p className="text-sm text-slate-500">{deal.contactName} {deal.company ? `• ${deal.company}` : ''}</p>
                                            {address && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{address}</span>
                                                </div>
                                            )}
                                            {schedule && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{schedule}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                                                {deal.stage}
                                            </span>
                                            <div className="flex items-center text-sm font-bold text-emerald-600">
                                                <DollarSign className="w-3.5 h-3.5" />
                                                {deal.value.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
