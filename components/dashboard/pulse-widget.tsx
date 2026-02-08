"use client"

import { cn } from "@/lib/utils"

interface PulseWidgetProps {
    className?: string
    weeklyRevenue?: number
    outstandingDebt?: number
    mode?: 'tradie' | 'agent'
}

export function PulseWidget({
    className,
    weeklyRevenue = 4200,
    outstandingDebt = 850,
    mode = 'tradie'
}: PulseWidgetProps) {
    const isAgent = mode === 'agent';

    return (
        <div className={cn(
            "px-4 py-2 rounded-full border shadow-lg flex items-center justify-center backdrop-blur-md transition-colors",
            isAgent
                ? "bg-white/90 border-amber-200/50 text-slate-900"
                : "bg-black/60 border-white/10 text-white",
            className
        )}>
            <span className={cn("text-sm font-medium", isAgent ? "text-amber-600" : "text-emerald-400")}>
                Wk: ${weeklyRevenue.toLocaleString()}
            </span>
            <span className={cn("mx-2", isAgent ? "text-slate-300" : "text-slate-600")}>|</span>
            <span className={cn("text-sm font-medium", isAgent ? "text-slate-500" : "text-red-400")}>
                {isAgent ? "Pipeline" : "Owe"}: ${outstandingDebt.toLocaleString()}
            </span>
        </div>
    )
}
