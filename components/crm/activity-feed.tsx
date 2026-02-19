"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Calendar, CheckCircle2, MessageSquare, FileText } from "lucide-react"
import { getActivities, ActivityView } from "@/actions/activity-actions"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ActivityFeedProps {
    contactId?: string
    dealId?: string
    limit?: number
    className?: string
    activities?: ActivityView[]
    workspaceId?: string
    compact?: boolean // New prop for simplified view
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    task: CheckCircle2,
    note: FileText
}

const COLOR_MAP: Record<string, string> = {
    email: "text-blue-500 bg-blue-500/10",
    call: "text-amber-500 bg-amber-500/10",
    meeting: "text-purple-500 bg-purple-500/10",
    task: "text-emerald-500 bg-emerald-500/10",
    note: "text-slate-500 bg-slate-500/10"
}

export function ActivityFeed({ contactId, dealId, limit = 20, className, activities: initialData, workspaceId, compact = false }: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityView[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)
    const router = useRouter()

    useEffect(() => {
        let mounted = true
        if (initialData && !loading) {
            setActivities(initialData)
            return;
        }

        async function fetchActivities() {
            try {
                const data = await getActivities({
                    contactId,
                    dealId,
                    limit,
                    workspaceId
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
    }, [contactId, dealId, limit, workspaceId, initialData])

    const Content = (
        <div className="h-full overflow-y-auto custom-scrollbar px-3 py-3">
            {loading ? (
                <div className="flex flex-col gap-4 p-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-2 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                        <MessageSquare className="h-5 w-5 opacity-40" />
                    </div>
                    No recent activity
                </div>
            ) : (
                <div className="space-y-1">
                    {activities.map((activity) => {
                        const Icon = ICON_MAP[activity.type] || MessageSquare
                        const colorClass = COLOR_MAP[activity.type] || "text-slate-500 bg-slate-500/10"

                        return (
                            <div
                                key={activity.id}
                                className="flex gap-3 items-start group cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all duration-200 border border-transparent hover:border-border/50"
                                onClick={() => {
                                    if (activity.dealId) router.push(`/dashboard/deals/${activity.dealId}`)
                                    else if (activity.contactId) router.push(`/dashboard/contacts/${activity.contactId}`)
                                }}
                            >
                                <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${colorClass}`}>
                                    <Icon className="h-3 w-3" />
                                </div>
                                <div className="flex-1 space-y-0.5 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-1">
                                            {activity.contactName ? `${activity.contactName} — ${activity.title}` : activity.title}
                                        </p>
                                        <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                            {activity.time}
                                        </span>
                                    </div>
                                    {activity.description && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                                            {activity.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )

    if (compact) {
        return Content
    }

    return (
        <div className={cn("glass-card flex flex-col h-full rounded-2xl overflow-hidden", className)}>
            <div className="pb-3 pt-4 px-5 border-b border-border/10 bg-white/5 shrink-0 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {contactId || dealId ? 'History' : 'Activity Feed'}
                </h3>
                <span className="text-[10px] font-medium text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {activities.length}
                </span>
            </div>
            <div className="flex-1 overflow-hidden min-h-0 bg-background/20 backdrop-blur-sm">
                {Content}
            </div>
        </div>
    )
}
