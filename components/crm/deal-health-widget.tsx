"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DealView } from "@/actions/deal-actions"

interface DealHealthWidgetProps {
    deals: DealView[]
}

export function DealHealthWidget({ deals }: DealHealthWidgetProps) {
    const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)
    const rottingDeals = deals.filter(d => d.health.status === 'ROTTING')
    const staleDeals = deals.filter(d => d.health.status === 'STALE')

    // Only show if there's something to worry about, or at least show summaries
    // If everything is healthy, we show a positive state.

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="cursor-help">
                                <CardTitle className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors truncate">Total Pipeline</CardTitle>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Sum of all active deals (excluding Lost)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">
                        ${totalValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {deals.length} active deals
                    </p>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                    <CardTitle className="text-xs sm:text-sm font-medium text-slate-500 truncate">Healthy</CardTitle>
                    <Clock className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                        {deals.length - rottingDeals.length - staleDeals.length}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">On track</p>
                </CardContent>
            </Card>

            {staleDeals.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-amber-900 truncate">Stale Deals</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
                            {staleDeals.length}
                        </div>
                        <p className="text-xs text-amber-800 font-medium mt-1">
                            No activity {'>'} 7 days
                        </p>
                    </CardContent>
                </Card>
            )}

            {rottingDeals.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                        <CardTitle className="text-xs sm:text-sm font-semibold text-red-900 truncate">Rotting Deals</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                        <div className="text-2xl sm:text-3xl font-bold text-red-700 tracking-tight">
                            {rottingDeals.length}
                        </div>
                        <p className="text-xs text-red-800 font-medium mt-1">
                            No activity {'>'} 14 days
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
