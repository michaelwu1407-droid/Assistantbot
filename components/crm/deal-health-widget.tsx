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
        <div className="grid gap-6 grid-cols-2 md:grid-cols-4 h-full">
            {/* Total Pipeline Card */}
            <div className="ott-card relative overflow-hidden group">
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-[#475569] mb-1">
                        <div className="p-2 bg-gray-100 rounded-full">
                            <DollarSign className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wide">Pipeline</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tighter">
                        ${totalValue.toLocaleString()}
                    </div>
                    <div className="flex items-center text-xs font-bold text-[#00D28B] bg-[#ECFDF5] w-fit px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>{deals.length} active deals</span>
                    </div>
                </div>
            </div>

            {/* Healthy Deals Card */}
            <div className="ott-card relative overflow-hidden group">
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-[#475569] mb-1">
                        <div className="p-2 bg-emerald-50 rounded-full">
                            <Activity className="w-4 h-4 text-[#00D28B]" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wide">Healthy</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tighter">
                        {healthyCount}
                    </div>
                    <div className="flex items-center text-xs font-medium text-[#475569]">
                        <span className="w-2 h-2 rounded-full bg-[#00D28B] mr-2 animate-pulse" />
                        On track
                    </div>
                </div>
            </div>

            {/* Stale Deals Card (Conditional or Placeholder) */}
            <div className="ott-card relative overflow-hidden group">
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-[#475569] mb-1">
                        <div className="p-2 bg-amber-50 rounded-full">
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wide">Stale</span>
                    </div>
                    <div className={cn("text-3xl md:text-4xl font-extrabold tracking-tighter", staleDeals.length > 0 ? "text-amber-600" : "text-[#0F172A]")}>
                        {staleDeals.length}
                    </div>
                    <div className="flex items-center text-xs font-medium text-[#475569]">
                        {staleDeals.length > 0 ? "No activity > 7 days" : "All good"}
                    </div>
                </div>
            </div>

            {/* Rotting Deals Card */}
            <div className="ott-card relative overflow-hidden group">
                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-[#475569] mb-1">
                        <div className="p-2 bg-red-50 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wide">Rotting</span>
                    </div>
                    <div className={cn("text-3xl md:text-4xl font-extrabold tracking-tighter", rottingDeals.length > 0 ? "text-red-600" : "text-[#0F172A]")}>
                        {rottingDeals.length}
                    </div>
                    <div className="flex items-center text-xs font-medium text-[#475569]">
                        {rottingDeals.length > 0 ? "Needs attention" : "No critical issues"}
                    </div>
                </div>
            </div>
        </div>
    )
}
