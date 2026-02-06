"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Calendar, CheckCircle2, FileText, MessageSquare } from "lucide-react"
import type { ActivityView } from "@/actions/activity-actions"

interface ActivityFeedProps {
    activities?: ActivityView[]
}

export function ActivityFeed({ activities = [] }: ActivityFeedProps) {
    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case "email": return Mail
            case "call": return Phone
            case "meeting": return Calendar
            case "task": return CheckCircle2
            case "note": return FileText
            default: return MessageSquare
        }
    }

    const getColor = (type: string) => {
        switch (type.toLowerCase()) {
            case "email": return "text-blue-500 bg-blue-50"
            case "meeting": return "text-purple-500 bg-purple-50"
            case "call": return "text-amber-500 bg-amber-50"
            case "task": return "text-emerald-500 bg-emerald-50"
            default: return "text-slate-500 bg-slate-50"
        }
    }

    return (
        <Card className="h-full border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No recent activity</p>
                    ) : (
                        activities.map((activity) => {
                            const Icon = getIcon(activity.type)
                            return (
                                <div key={activity.id} className="flex gap-3 items-start group">
                                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(activity.type)}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {activity.title}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-1">
                                            {activity.description || activity.title}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
