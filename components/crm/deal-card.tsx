"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, DollarSign, AlertCircle, Building2, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
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
    let cardClasses = "glass-card hover:border-primary/30"
    let statusBadge = null

    if (deal.health?.status === "ROTTING") {
        cardClasses = "glass-card border-red-500/50 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)] bg-red-500/5"
        statusBadge = (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm z-10 font-bold tracking-wide">
                <AlertCircle className="w-3 h-3 mr-1" />
                Rotting
            </div>
        )
    } else if (deal.health?.status === "STALE") {
        cardClasses = "glass-card border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)] bg-amber-500/5"
        statusBadge = (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm font-bold z-10 tracking-wide">
                <AlertCircle className="w-3 h-3 mr-1" />
                Stale
            </div>
        )
    }

    const daysSinceActivity = deal.health?.daysSinceActivity ?? 0

    if (overlay) {
        cardClasses += " cursor-grabbing shadow-2xl scale-105 rotate-2 z-50 ring-2 ring-primary/20"
    } else if (isDragging) {
        cardClasses += " opacity-30 grayscale"
    } else {
        cardClasses += " cursor-grab active:cursor-grabbing"
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative group touch-none"
            onClick={() => window.location.href = `/dashboard/deals/${deal.id}`}
        >
            <div className={cn("rounded-xl p-4 transition-all duration-300 relative overflow-hidden", cardClasses)}>
                {/* Decorative glow for overlay */}
                {overlay && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}

                {statusBadge}

                <div className="space-y-3 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start pr-6">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate capitalize text-sm md:text-base leading-tight">
                                {deal.title}
                            </h4>
                            <div className="flex items-center text-xs text-muted-foreground mt-1 truncate">
                                <Building2 className="w-3 h-3 mr-1 opacity-70" />
                                <span className="truncate">{deal.company}</span>
                            </div>
                        </div>
                    </div>

                    {/* Value & Contact */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center text-foreground font-bold text-sm bg-background/50 px-2 py-1 rounded-lg border border-border/50">
                            <DollarSign className="w-3 h-3 text-emerald-500 mr-0.5" />
                            {deal.value.toLocaleString()}
                        </div>
                        {deal.contactName && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 pl-1 pr-2 py-0.5 rounded-full border border-border/30">
                                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                    {deal.contactName.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[80px]">{deal.contactName.split(' ')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer: Date */}
                    <div className={cn(
                        "flex items-center text-[10px] font-medium pt-3 mt-1 border-t border-border/30",
                        (deal.health?.status === "ROTTING" || deal.health?.status === "STALE") ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                        {daysSinceActivity === 0 ? "Updated today" : `Active ${daysSinceActivity}d ago`}
                    </div>
                </div>
            </div>
        </div>
    )
}
