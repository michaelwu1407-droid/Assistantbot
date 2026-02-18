"use client"

import React from "react"
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

    // Track pointer movement to distinguish click from drag
    const pointerStart = React.useRef<{ x: number; y: number } | null>(null)

    // Stale Logic (Backend provided)
    let cardClasses = "ott-card bg-white hover:border-[#00D28B] p-5"
    let statusBadge = null

    if (deal.health?.status === "ROTTING") {
        cardClasses = "ott-card bg-red-50 border-red-500/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] p-5"
        statusBadge = (
            <div className="absolute top-3 right-3 bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm z-10 font-bold tracking-wide border border-red-100">
                <AlertCircle className="w-3 h-3 mr-1" />
                Rotting
            </div>
        )
    } else if (deal.health?.status === "STALE") {
        cardClasses = "ott-card bg-amber-50 border-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] p-4"
        statusBadge = (
            <div className="absolute top-3 right-3 bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm font-bold z-10 tracking-wide border border-amber-100">
                <AlertCircle className="w-3 h-3 mr-1" />
                Stale
            </div>
        )
    }

    const daysSinceActivity = deal.health?.daysSinceActivity ?? 0

    if (overlay) {
        cardClasses += " cursor-grabbing shadow-2xl scale-105 rotate-2 z-50 ring-2 ring-[#00D28B]/20"
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
            onPointerDown={(e) => { pointerStart.current = { x: e.clientX, y: e.clientY } }}
            onClick={(e) => {
                // Only navigate if pointer didn't move significantly (i.e. not a drag)
                if (pointerStart.current) {
                    const dx = Math.abs(e.clientX - pointerStart.current.x)
                    const dy = Math.abs(e.clientY - pointerStart.current.y)
                    if (dx > 5 || dy > 5) {
                        e.preventDefault()
                        e.stopPropagation()
                        pointerStart.current = null
                        return
                    }
                }
                pointerStart.current = null
                window.location.href = `/dashboard/deals/${deal.id}`
            }}
        >
            <div className={cn("relative overflow-hidden", cardClasses)}>

                {statusBadge}

                <div className="space-y-3 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start pr-6">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#0F172A] truncate capitalize text-base leading-tight mb-1">
                                {deal.title}
                            </h4>
                            {deal.address && (
                                <div className="flex items-center text-[11px] text-[#64748B] mb-1.5 truncate">
                                    <span className="truncate">{deal.address}</span>
                                </div>
                            )}
                            <div className="flex items-center text-xs text-[#475569] truncate">
                                <span className="truncate">{deal.company || "No Company"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Value & Contact */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center text-[#0F172A] font-extrabold text-sm bg-[#F8FAFC] px-2 py-1 rounded-md border border-[#E2E8F0]">
                            <DollarSign className="w-3 h-3 text-[#00D28B] mr-0.5" />
                            {deal.value.toLocaleString()}
                        </div>
                        {deal.contactName && (
                            <div className="flex items-center gap-1.5 text-xs text-[#475569] bg-white pl-1 pr-2 py-0.5 rounded-full border border-[#E2E8F0] shadow-sm">
                                <div className="h-5 w-5 rounded-full bg-[#00D28B] flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                    {deal.contactName.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[80px]">{deal.contactName.split(' ')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer: Date */}
                    <div className={cn(
                        "flex items-center text-[10px] font-medium pt-3 mt-1 border-t border-[#F1F5F9]",
                        (deal.health?.status === "ROTTING" || deal.health?.status === "STALE") ? "text-amber-600" : "text-[#94A3B8]"
                    )}>
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                        {daysSinceActivity === 0 ? "Updated today" : `Active ${daysSinceActivity}d ago`}
                    </div>
                </div>
            </div>
        </div>
    )
}
