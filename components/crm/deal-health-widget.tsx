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
            <div className="ott-card p-6 flex flex-col justify-between h-full min-h-[180px]">
                <div className="flex justify-between items-start">
                    <span className="text-lg font-bold text-[#0F172A] tracking-tight">Pipeline</span>
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-md transform -rotate-45">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-extrabold text-[#0F172A] tracking-tighter">
                            ${totalValue.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-[#00D28B]">+12.7%</span>
                    </div>
                    <span className="text-sm font-medium text-[#94A3B8]">Total potential value</span>
                </div>
            </div>

            {/* Healthy Deals Card */}
            <div className="ott-card p-6 flex flex-col justify-between h-full min-h-[180px]">
                <div className="flex justify-between items-start">
                    <span className="text-lg font-bold text-[#0F172A] tracking-tight">Healthy</span>
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-md transform -rotate-45">
                        <Activity className="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-extrabold text-[#0F172A] tracking-tighter">
                            {healthyCount}
                        </span>
                        <span className="text-sm font-bold text-[#00D28B]">+63.0%</span>
                    </div>
                    <span className="text-sm font-medium text-[#94A3B8]">On track deals</span>
                </div>
            </div>

            {/* Stale Deals Card */}
            <div className="ott-card p-6 flex flex-col justify-between h-full min-h-[180px]">
                <div className="flex justify-between items-start">
                    <span className="text-lg font-bold text-[#0F172A] tracking-tight">Stale</span>
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-md transform -rotate-45">
                        <Clock className="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className={cn("text-4xl font-extrabold tracking-tighter", staleDeals.length > 0 ? "text-amber-500" : "text-[#0F172A]")}>
                            {staleDeals.length}
                        </span>
                        <span className="text-sm font-bold text-amber-500">+10.7%</span>
                    </div>
                    <span className="text-sm font-medium text-[#94A3B8]">No activity &gt; 7 days</span>
                </div>
            </div>

            {/* Rotting Deals Card */}
            <div className="ott-card p-6 flex flex-col justify-between h-full min-h-[180px]">
                <div className="flex justify-between items-start">
                    <span className="text-lg font-bold text-[#0F172A] tracking-tight">Rotting</span>
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white shadow-md transform -rotate-45">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className={cn("text-4xl font-extrabold tracking-tighter", rottingDeals.length > 0 ? "text-red-500" : "text-[#0F172A]")}>
                            {rottingDeals.length}
                        </span>
                        <span className="text-sm font-bold text-red-500">-2.4%</span>
                    </div>
                    <span className="text-sm font-medium text-[#94A3B8]">Needs attention</span>
                </div>
            </div>
        </div>
    )
}
