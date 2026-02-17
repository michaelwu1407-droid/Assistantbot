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
            <div className="ott-card relative overflow-hidden group p-6 md:p-8">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 text-[#64748B] mb-2">
                        <div className="p-2.5 bg-slate-100 rounded-full">
                            <DollarSign className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wide">Pipeline</span>
                    </div>
                    <div className="text-3xl md:text-3xl font-extrabold text-[#0F172A] tracking-tighter">
                        ${totalValue.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Healthy Deals Card */}
            <div className="ott-card relative overflow-hidden group p-6 md:p-8">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 text-[#64748B] mb-2">
                        <div className="p-2.5 bg-emerald-50 rounded-full">
                            <Activity className="w-5 h-5 text-[#00D28B]" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wide">Healthy</span>
                    </div>
                    <div className="text-3xl md:text-3xl font-extrabold text-[#0F172A] tracking-tighter">
                        {healthyCount}
                    </div>
                </div>
            </div>

            {/* Stale Deals Card */}
            <div className="ott-card relative overflow-hidden group p-6 md:p-8">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 text-[#64748B] mb-2">
                        <div className="p-2.5 bg-amber-50 rounded-full">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wide">Stale</span>
                    </div>
                    <div className={cn("text-3xl md:text-3xl font-extrabold tracking-tighter", staleDeals.length > 0 ? "text-amber-600" : "text-[#0F172A]")}>
                        {staleDeals.length}
                    </div>
                </div>
            </div>

            {/* Rotting Deals Card */}
            <div className="ott-card relative overflow-hidden group p-6 md:p-8">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 text-[#64748B] mb-2">
                        <div className="p-2.5 bg-red-50 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wide">Rotting</span>
                    </div>
                    <div className={cn("text-3xl md:text-3xl font-extrabold tracking-tighter", rottingDeals.length > 0 ? "text-red-600" : "text-[#0F172A]")}>
                        {rottingDeals.length}
                    </div>
                </div>
            </div>
        </div>
    )
}
