"use client"

import React, { useEffect, useState } from "react"
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
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    task: CheckCircle2,
    note: FileText
}

const COLOR_MAP: Record<string, string> = {
    email: "text-blue-500 bg-blue-50",
    call: "text-amber-500 bg-amber-50",
    meeting: "text-purple-500 bg-purple-50",
    task: "text-emerald-500 bg-emerald-50",
    note: "text-slate-500 bg-slate-50"
}

export function ActivityFeed({ contactId, dealId, limit = 20, className, activities: initialData, workspaceId }: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityView[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)

    useEffect(() => {
        let mounted = true
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
    }, [contactId, dealId, limit])

    return (
        <Card className={cn("h-full border-border/50 shadow-sm flex flex-col overflow-hidden", className)}>
            <CardHeader className="pb-3 pt-5 px-5 border-b border-border/40 bg-muted/20 shrink-0">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    {contactId || dealId ? 'History' : 'Recent Activity'}
                    <span className="text-xs font-normal text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
                        {activities.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden min-h-0">
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
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-12">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <MessageSquare className="h-5 w-5 opacity-40" />
                            </div>
                            No activity found
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activities.map((activity) => {
                                const Icon = ICON_MAP[activity.type] || MessageSquare
                                const colorClass = COLOR_MAP[activity.type] || "text-slate-500 bg-slate-50"

                                return (
                                    <div
                                        key={activity.id}
                                        className="flex gap-3 items-start group cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border border-transparent hover:border-border/50"
                                        onClick={() => {
                                            if (activity.dealId) window.location.href = `/dashboard/deals/${activity.dealId}`
                                            else if (activity.contactId) window.location.href = `/dashboard/contacts/${activity.contactId}`
                                        }}
                                    >
                                        <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${colorClass}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                {activity.title}
                                            </p>
                                            {activity.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {activity.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 font-medium">
                                            {activity.time}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
