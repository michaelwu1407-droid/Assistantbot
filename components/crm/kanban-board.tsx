"use client"

import { useState, useEffect } from "react"
import { DealCard, Deal } from "./deal-card"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateDealStage } from "@/actions/deal-actions"
import { useRouter } from "next/navigation"

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
    const [deals, setDeals] = useState(initialDeals)
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
    const router = useRouter()

    // Sync state if props change (e.g. after server refresh)
    useEffect(() => {
        setDeals(initialDeals)
    }, [initialDeals])

    const handleDragStart = (e: React.DragEvent, dealId: string) => {
        setDraggedDealId(dealId)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", dealId)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
    }

    const handleDrop = async (e: React.DragEvent, stageId: string) => {
        e.preventDefault()
        const dealId = draggedDealId
        if (!dealId) return

        // Find the deal
        const deal = deals.find(d => d.id === dealId)
        if (!deal || deal.stage === stageId) return

        // Optimistic update
        const updatedDeals = deals.map(d => 
            d.id === dealId ? { ...d, stage: stageId } : d
        )
        setDeals(updatedDeals)
        setDraggedDealId(null)

        // Server action
        try {
            const result = await updateDealStage(dealId, stageId)
            if (!result.success) {
                // Revert on failure
                console.error("Failed to update stage:", result.error)
                setDeals(deals)
            } else {
                // Refresh server data to ensure consistency
                router.refresh()
            }
        } catch (error) {
            console.error("Error updating stage:", error)
            setDeals(deals)
        }
    }

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start no-scrollbar">
            {COLUMNS.map((col) => {
                const colDeals = deals.filter((d) => d.stage === col.id)

                return (
                    <div 
                        key={col.id} 
                        className="w-80 flex-shrink-0 flex flex-col h-full max-h-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
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
                        <div className={`flex-1 bg-slate-50/50 rounded-xl border border-slate-200/60 p-2 overflow-y-auto min-h-[150px] transition-colors ${draggedDealId ? 'bg-slate-100/50' : ''}`}>
                            {colDeals.length > 0 ? (
                                colDeals.map((deal) => (
                                    <div
                                        key={deal.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, deal.id)}
                                        className="mb-3 cursor-grab active:cursor-grabbing"
                                    >
                                        <DealCard deal={deal} />
                                    </div>
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
