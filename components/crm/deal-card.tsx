"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, DollarSign, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
// import { differenceInDays } from "date-fns" // Handled by backend health check now
import { DealView } from "@/actions/deal-actions"

interface DealCardProps {
    deal: DealView
    overlay?: boolean
}

export function DealCard({ deal, overlay }: DealCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: deal.id,
        data: {
            type: "Deal",
            deal
        }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    // Stale Logic (Backend provided)
    let statusColor = "border-slate-200"
    let statusBadge = null

    if (deal.health?.status === "ROTTING") {
        statusColor = "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        statusBadge = (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm z-10">
                <AlertCircle className="w-3 h-3 mr-1" />
                Rotting
            </div>
        )
    } else if (deal.health?.status === "STALE") {
        statusColor = "border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
        statusBadge = (
            <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm font-bold z-10">
                <AlertCircle className="w-3 h-3 mr-1" />
                Stale
            </div>
        )
    }

    const daysSinceActivity = deal.health?.daysSinceActivity ?? 0

    if (overlay) {
        statusColor += " cursor-grabbing shadow-2xl scale-105 rotate-2"
    } else if (isDragging) {
        statusColor += " opacity-30"
    } else {
        statusColor += " cursor-grab hover:border-slate-300 hover:shadow-md transition-all"
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="mb-3 relative group"
            onClick={() => window.location.href = `/dashboard/deals/${deal.id}`} // Simple navigation for now
        >
            <Card className={cn("transition-colors select-none cursor-pointer hover:border-slate-400", statusColor)}>
                {statusBadge}
                <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-slate-900 line-clamp-1">{deal.title}</h4>
                            <p className="text-xs text-slate-500">{deal.company}</p>
                        </div>
                        {/* Grab handle visual cue could go here */}
                    </div>

                    {/* Value & Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-900 font-bold">
                            <DollarSign className="w-3 h-3 text-slate-400 mr-0.5" />
                            {deal.value.toLocaleString()}
                        </div>
                        {deal.contactName && (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 border border-slate-200" title={deal.contactName}>
                                {deal.contactName.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Footer: Date */}
                    <div className={cn(
                        "flex items-center text-xs pt-2 border-t border-slate-100",
                        (deal.health?.status === "ROTTING" || deal.health?.status === "STALE") ? "text-amber-600" : "text-slate-400"
                    )}>
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {daysSinceActivity === 0 ? "Today" : `${daysSinceActivity}d ago`}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
