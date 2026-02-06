"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge" // We might need to create this later if not exists, for now I'll use standard Tailwind
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Same here
import { Calendar, DollarSign, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { differenceInDays } from "date-fns"

export type Deal = {
    id: string
    title: string
    company: string
    value: number
    stage: string
    lastActivityDate: Date
    contactName: string
    contactAvatar?: string
}

interface DealCardProps {
    deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
    const daysSinceActivity = differenceInDays(new Date(), deal.lastActivityDate)

    // Stale Logic
    let statusColor = "border-slate-200"
    let statusBadge = null

    if (daysSinceActivity > 14) {
        statusColor = "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
        statusBadge = (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm">
                <AlertCircle className="w-3 h-3 mr-1" />
                Rotting
            </div>
        )
    } else if (daysSinceActivity > 7) {
        statusColor = "border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
        statusBadge = (
            <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full flex items-center shadow-sm font-bold">
                <AlertCircle className="w-3 h-3 mr-1" />
                Stale
            </div>
        )
    }

    return (
        <motion.div
            layoutId={deal.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="relative"
        >
            <Card className={cn("mb-3 cursor-grab active:cursor-grabbing transition-colors", statusColor)}>
                {statusBadge}
                <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-slate-900 line-clamp-1">{deal.title}</h4>
                            <p className="text-xs text-slate-500">{deal.company}</p>
                        </div>
                    </div>

                    {/* Value & Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-900 font-bold">
                            <DollarSign className="w-3 h-3 text-slate-400 mr-0.5" />
                            {deal.value.toLocaleString()}
                        </div>
                        {deal.contactName && (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 border border-slate-200" title={deal.contactName}>
                                {deal.contactName.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Footer: Date */}
                    <div className={cn(
                        "flex items-center text-xs pt-2 border-t border-slate-100",
                        daysSinceActivity > 7 ? "text-amber-600" : "text-slate-400"
                    )}>
                        <Calendar className="w-3 h-3 mr-1.5" />
                        {daysSinceActivity === 0 ? "Today" : `${daysSinceActivity}d ago`}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
