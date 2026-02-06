"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DealCard, Deal } from "./deal-card"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const COLUMNS = [
    { id: "new", title: "New Lead", color: "bg-blue-500" },
    { id: "contacted", title: "Contacted", color: "bg-indigo-500" },
    { id: "negotiation", title: "Negotiation", color: "bg-amber-500" },
    { id: "won", title: "Won", color: "bg-emerald-500" },
    { id: "lost", title: "Lost", color: "bg-slate-400" },
]

interface KanbanBoardProps {
    deals: Deal[]
}

export function KanbanBoard({ deals: initialDeals }: KanbanBoardProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [deals, setDeals] = useState(initialDeals)

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start no-scrollbar">
            {COLUMNS.map((col) => {
                const colDeals = deals.filter((d) => d.stage === col.id)

                return (
                    <div key={col.id} className="w-80 flex-shrink-0 flex flex-col h-full max-h-full">
                        {/* Column Header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                <h3 className="font-semibold text-slate-700 text-sm">{col.title}</h3>
                                <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                    {colDeals.length}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-slate-900">
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Column Body / Drop Zone */}
                        <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200/60 p-2 overflow-y-auto min-h-[150px]">
                            {colDeals.length > 0 ? (
                                colDeals.map((deal) => (
                                    <DealCard key={deal.id} deal={deal} />
                                ))
                            ) : (
                                <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                                    Drop items here
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
