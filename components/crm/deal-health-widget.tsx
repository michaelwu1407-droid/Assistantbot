"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Clock, AlertTriangle, DollarSign, Activity } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"

interface DealHealthWidgetProps {
    deals: DealView[]
}

export function DealHealthWidget({ deals }: DealHealthWidgetProps) {
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)
    const rottingDeals = deals.filter(d => d.health.status === 'ROTTING')
    const staleDeals = deals.filter(d => d.health.status === 'STALE')
    const healthyCount = deals.length - rottingDeals.length - staleDeals.length

    return (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 h-full">
            {/* Total Pipeline Card */}
            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pipeline</span>
                    <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                        ${totalValue.toLocaleString()}
                    </div>
                </div>
                <div className="mt-2 flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    <span>{deals.length} active deals</span>
                </div>
            </div>

            {/* Healthy Deals Card */}
            <div className="glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Healthy</span>
                    <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                        {healthyCount}
                    </div>
                </div>
                <div className="mt-2 flex items-center text-xs font-medium text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    On track
                </div>
            </div>

            {/* Stale Deals Card (Conditional or Placeholder) */}
            <div className={cn(
                "glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group transition-all",
                staleDeals.length > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
            )}>
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock className={cn("w-12 h-12", staleDeals.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stale</span>
                    <div className={cn("text-2xl md:text-3xl font-bold tracking-tight", staleDeals.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                        {staleDeals.length}
                    </div>
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">
                    {staleDeals.length > 0 ? "No activity > 7 days" : "All good"}
                </div>
            </div>

            {/* Rotting Deals Card */}
            <div className={cn(
                "glass-card rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group transition-all",
                rottingDeals.length > 0 ? "border-red-500/30 bg-red-500/5" : ""
            )}>
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertTriangle className={cn("w-12 h-12", rottingDeals.length > 0 ? "text-red-500" : "text-muted-foreground")} />
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rotting</span>
                    <div className={cn("text-2xl md:text-3xl font-bold tracking-tight", rottingDeals.length > 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                        {rottingDeals.length}
                    </div>
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">
                    {rottingDeals.length > 0 ? "Needs attention" : "No critical issues"}
                </div>
            </div>
        </div>
    )
}
