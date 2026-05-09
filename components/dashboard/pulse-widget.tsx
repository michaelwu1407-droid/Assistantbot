"use client"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

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
                ? "bg-card/90 border-amber-200/50 text-foreground"
                : "bg-black/60 border-white/10 text-white",
            className
        )}>
            <span className={cn("text-sm font-medium", isAgent ? "text-amber-600" : "text-emerald-400")}>
                Wk: {formatCurrency(weeklyRevenue)}
            </span>
            <span className={cn("mx-2", isAgent ? "text-slate-300" : "text-muted-foreground")}>|</span>
            <span className={cn("text-sm font-medium", isAgent ? "text-muted-foreground" : "text-red-400")}>
                {isAgent ? "Pipeline" : "Owe"}: {formatCurrency(outstandingDebt)}
            </span>
        </div>
    )
}
