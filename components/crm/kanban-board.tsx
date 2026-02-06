"use client"

import { useState, useEffect } from "react"
import { DealCard, Deal } from "./deal-card"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateDealStage } from "@/actions/deal-actions"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

// Sortable Item Wrapper
function SortableDealCard({ deal }: { deal: Deal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: "Deal", deal } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 touch-none">
      <DealCard deal={deal} />
    </div>
  )
}

// Droppable Column Wrapper
function KanbanColumn({
  id,
  title,
  color,
  deals,
}: {
  id: string
  title: string
  color: string
  deals: Deal[]
}) {
  const { setNodeRef } = useSortable({
    id: id,
    data: { type: "Column", id },
  })

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-slate-900">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Column Body / Drop Zone */}
      <div
        ref={setNodeRef}
        className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200/60 p-2 overflow-y-auto min-h-[150px]"
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
            Drop items here
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ deals: initialDeals }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const router = useRouter()

  // Sync state if props change (e.g. after server refresh)
  useEffect(() => {
    setDeals(initialDeals)
  }, [initialDeals])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const deal = deals.find((d) => d.id === active.id)
    if (deal) setActiveDeal(deal)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Find the containers
    const activeDeal = deals.find((d) => d.id === activeId)
    const overDeal = deals.find((d) => d.id === overId)
    
    if (!activeDeal) return

    const activeStage = activeDeal.stage
    const overStage = overDeal ? overDeal.stage : (COLUMNS.find(c => c.id === overId)?.id)

    if (activeStage !== overStage && overStage) {
      setDeals((prev) => {
        return prev.map((d) => 
          d.id === activeId ? { ...d, stage: overStage } : d
        )
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeDeal = deals.find((d) => d.id === activeId)
    if (!activeDeal) return

    // Determine new stage
    let newStage = activeDeal.stage
    
    // If dropped on a column directly
    if (COLUMNS.some(c => c.id === overId)) {
      newStage = overId
    } 
    // If dropped on another card
    else {
      const overDeal = deals.find(d => d.id === overId)
      if (overDeal) newStage = overDeal.stage
    }

    // Only update if stage changed
    if (activeDeal.stage !== newStage) {
       // Optimistic update already happened in DragOver, but let's ensure final state is clean
       // Server action
       try {
        const result = await updateDealStage(activeId, newStage)
        if (!result.success) {
            console.error("Failed to update stage:", result.error)
            // Revert would require tracking previous state, for now we just refresh
            router.refresh()
        } else {
            router.refresh()
        }
      } catch (error) {
        console.error("Error updating stage:", error)
        router.refresh()
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start no-scrollbar">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            deals={deals.filter((d) => d.stage === col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
