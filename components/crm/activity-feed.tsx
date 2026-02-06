"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Calendar, CheckCircle2 } from "lucide-react"

const activities = [
    {
        id: 1,
        type: "email",
        title: "Email logged from tesla.com",
        description: "Re: Partnership Opportunity",
        time: "10m ago",
        icon: Mail,
        color: "text-blue-500 bg-blue-50",
    },
    {
        id: 2,
        type: "meeting",
        title: "Meeting scheduled with John Doe",
        description: "Product Demo - Tomorrow 10am",
        time: "2h ago",
        icon: Calendar,
        color: "text-purple-500 bg-purple-50",
    },
    {
        id: 3,
        type: "call",
        title: "Missed call from +61 400 000 000",
        description: "Callback reminder set",
        time: "4h ago",
        icon: Phone,
        color: "text-amber-500 bg-amber-50",
    },
    {
        id: 4,
        type: "task",
        title: "Task completed: Send Invoice",
        description: "Invoice #1023 sent to Client X",
        time: "1d ago",
        icon: CheckCircle2,
        color: "text-emerald-500 bg-emerald-50",
    },
]

export function ActivityFeed() {
    return (
        <Card className="h-full border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3 items-start group">
                            <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                                <activity.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-0.5">
                                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-slate-500 line-clamp-1">
                                    {activity.description}
                                </p>
                            </div>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {activity.time}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
