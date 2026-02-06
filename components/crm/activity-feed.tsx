"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Calendar, CheckCircle2, MessageSquare } from "lucide-react"
import { getActivities, ActivityView } from "@/actions/activity-actions"
import { cn } from "@/lib/utils"

interface ActivityFeedProps {
    contactId?: string
    dealId?: string
    limit?: number
    className?: string
}

const ICON_MAP: Record<string, any> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    task: CheckCircle2,
    note: MessageSquare
}

const COLOR_MAP: Record<string, string> = {
    email: "text-blue-500 bg-blue-50",
    call: "text-amber-500 bg-amber-50",
    meeting: "text-purple-500 bg-purple-50",
    task: "text-emerald-500 bg-emerald-50",
    note: "text-slate-500 bg-slate-50"
}

export function ActivityFeed({ contactId, dealId, limit = 20, className }: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityView[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        async function fetchActivities() {
            try {
                const data = await getActivities({
                    contactId,
                    dealId,
                    limit,
                    workspaceId: "demo-workspace"
                })
                if (mounted) {
                    setActivities(data)
                }
            } catch (error) {
                console.error("Failed to fetch activities", error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        fetchActivities()
        return () => { mounted = false }
    }, [contactId, dealId, limit])

    return (
        <Card className={cn("h-full border-slate-200 shadow-none", className)}>
            <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {contactId || dealId ? 'History' : 'Recent Activity'}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2 h-[300px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col gap-3 p-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-slate-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                        No activity found
                    </div>
                ) : (
                    <div className="space-y-4 p-2">
                        {activities.map((activity) => {
                            const Icon = ICON_MAP[activity.type] || MessageSquare
                            const colorClass = COLOR_MAP[activity.type] || "text-slate-500 bg-slate-50"

                            return (
                                <div key={activity.id} className="flex gap-3 items-start group">
                                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                            {activity.title}
                                        </p>
                                        {activity.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1">
                                                {activity.description}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                        {activity.time}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
