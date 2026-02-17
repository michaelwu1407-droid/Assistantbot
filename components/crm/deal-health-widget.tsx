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
        <div className="grid gap-2 grid-cols-4 h-full min-w-[800px]">
            {/* Total Pipeline Card */}
            <div className="ott-card p-2 flex flex-col justify-center h-full min-h-[45px]">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">Pipeline</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-[#0F172A] tracking-tighter leading-none">
                                ${totalValue.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold text-[#00D28B]">+12%</span>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A]">
                        <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* Healthy Deals Card */}
            <div className="ott-card p-2 flex flex-col justify-center h-full min-h-[45px]">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">Healthy</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-[#0F172A] tracking-tighter leading-none">
                                {healthyCount}
                            </span>
                            <span className="text-[9px] font-bold text-[#00D28B]">Active</span>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#0F172A]">
                        <Activity className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* Stale Deals Card */}
            <div className="ott-card p-2 flex flex-col justify-center h-full min-h-[45px]">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">Stale</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-base font-extrabold tracking-tighter leading-none", staleDeals.length > 0 ? "text-amber-500" : "text-[#0F172A]")}>
                                {staleDeals.length}
                            </span>
                            <span className="text-[9px] font-bold text-amber-500">Attr</span>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#FFFBEB] flex items-center justify-center text-amber-600">
                        <Clock className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* Rotting Deals Card */}
            <div className="ott-card p-2 flex flex-col justify-center h-full min-h-[45px]">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">Rotting</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-base font-extrabold tracking-tighter leading-none", rottingDeals.length > 0 ? "text-red-500" : "text-[#0F172A]")}>
                                {rottingDeals.length}
                            </span>
                            <span className="text-[9px] font-bold text-red-500">Crit</span>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#FEF2F2] flex items-center justify-center text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    )
}
