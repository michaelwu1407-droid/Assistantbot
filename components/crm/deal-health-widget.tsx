"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Clock, AlertTriangle } from "lucide-react"
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
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Total Pipeline</CardTitle>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                        ${totalValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500">
                        {deals.length} active deals
                    </p>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Healthy</CardTitle>
                    <Clock className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                        {deals.length - rottingDeals.length - staleDeals.length}
                    </div>
                    <p className="text-xs text-slate-500">
                        On track
                    </p>
                </CardContent>
            </Card>

            {staleDeals.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-800">Stale Deals</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">
                            {staleDeals.length}
                        </div>
                        <p className="text-xs text-amber-700">
                            No activity {'>'} 7 days
                        </p>
                    </CardContent>
                </Card>
            )}

            {rottingDeals.length > 0 && (
                <Card className="border-red-200 bg-red-50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Rotting Deals</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">
                            {rottingDeals.length}
                        </div>
                        <p className="text-xs text-red-700">
                            No activity {'>'} 14 days
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
