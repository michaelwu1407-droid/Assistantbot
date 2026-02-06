"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, Calendar, CheckCircle2, FileText, MessageSquare, DollarSign } from "lucide-react"
import type { ActivityView } from "@/actions/activity-actions"
import type { DealView } from "@/actions/deal-actions"

interface ContactTimelineProps {
  activities: ActivityView[]
  deals: DealView[]
}

export function ContactTimeline({ activities, deals }: ContactTimelineProps) {
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

  return (
    <div className="space-y-6">
      {/* Active Deals Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-slate-500">No active deals.</p>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{deal.title}</p>
                      <p className="text-xs text-slate-500">Stage: {deal.stage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${deal.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{deal.daysInStage} days in stage</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l border-slate-200 space-y-8">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type)
              return (
                <div key={activity.id} className="relative">
                  <div className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Icon className="h-3 w-3 text-slate-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{activity.title}</span>
                      <span className="text-xs text-slate-400">{activity.time}</span>
                    </div>
                    <p className="text-sm text-slate-600">{activity.description || activity.title}</p>
                  </div>
                </div>
              )
            })}
            {activities.length === 0 && (
              <p className="text-sm text-slate-500 italic">No history yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
