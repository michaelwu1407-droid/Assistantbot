"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from "@dnd-kit/core"
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable"

import { DealCard } from "./deal-card"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DealView, updateDealStage } from "@/actions/deal-actions"
import { toast } from "sonner"
import { LossReasonModal } from "./loss-reason-modal"

// Define Column ID type to match Prisma enum / frontend map
type ColumnId = "new" | "contacted" | "negotiation" | "won" | "lost"

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: "new", title: "New Lead", color: "bg-blue-500" },
  { id: "contacted", title: "Contacted", color: "bg-indigo-500" },
  { id: "negotiation", title: "Negotiation", color: "bg-amber-500" },
  { id: "won", title: "Won", color: "bg-emerald-500" },
  { id: "lost", title: "Lost", color: "bg-muted-foreground" },
]


// Mapping for industry-specific column titles
const LABELS = {
  TRADES: {
    new: "New Jobs",
    contacted: "Quoted",
    negotiation: "In Progress",
    won: "Completed",
    lost: "Lost"
  },
  REAL_ESTATE: {
    new: "New Listings",
    contacted: "Appraised",
    negotiation: "Under Offer",
    won: "Settled",
    lost: "Withdrawn"
  },
  DEFAULT: {
    new: "New Lead",
    contacted: "Contacted",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost"
  }
}

interface KanbanBoardProps {
  deals: DealView[]
  industryType?: "TRADES" | "REAL_ESTATE" | null
}

/* ── Droppable Column wrapper ─────────────────────────────── */
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-3 overflow-y-auto min-h-[150px] flex flex-col gap-3 transition-colors ${isOver ? "bg-emerald-50 border-emerald-300 shadow-inner" : "hover:bg-white hover:shadow-inner"}`}
    >
      {children}
    </div>
  )
}

export function KanbanBoard({ deals: initialDeals, industryType }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const hasDragged = useRef(false)
  const [lossReasonModalOpen, setLossReasonModalOpen] = useState(false)
  const [pendingDeal, setPendingDeal] = useState<DealView | null>(null)

  // Sync state if props change (re-fetch) - but not during or after drag operations
  useEffect(() => {
    // Only sync if we haven't just completed a drag
    if (!activeId && !hasDragged.current) {
      setDeals(initialDeals)
    }
    // Note: hasDragged is reset in handleDragStart, not here
  }, [initialDeals, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Increased to better distinguish click vs drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Memoize deals by column for the SortableContext
  const columns = useMemo(() => {
    const cols: Record<string, DealView[]> = {
      new: [],
      contacted: [],
      negotiation: [],
      won: [],
      lost: []
    };
    deals.forEach(deal => {
      const stage = deal.stage.toLowerCase()
      if (cols[stage]) {
        cols[stage].push(deal)
      } else {
        // Fallback for unexpected stages
        cols["new"].push(deal)
      }
    })
    return cols
  }, [deals])

  const activeDeal = useMemo(() =>
    deals.find(d => d.id === activeId),
    [deals, activeId])

  function findColumnForItem(itemId: string): string | undefined {
    // Check if it's a column ID
    if (COLUMNS.find(c => c.id === itemId)) return itemId
    // Otherwise find which column the deal belongs to
    const deal = deals.find(d => d.id === itemId)
    return deal?.stage.toLowerCase()
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    hasDragged.current = true
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnForItem(activeId)
    const overColumn = findColumnForItem(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    setDeals((prev) => {
      const activeIndex = prev.findIndex((d) => d.id === activeId)
      if (activeIndex === -1) return prev

      const overDeal = prev.find(d => d.id === overId)
      const overIndex = overDeal ? prev.findIndex((d) => d.id === overId) : prev.length

      const newDeals = [...prev]
      newDeals[activeIndex] = {
        ...newDeals[activeIndex],
        stage: overColumn
      }

      return arrayMove(newDeals, activeIndex, overIndex)
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const draggedId = active.id as string

    if (!over) {
      setActiveId(null)
      return
    }

    const overId = over.id as string
    const draggedDeal = deals.find(d => d.id === draggedId)
    const targetColumn = findColumnForItem(overId)

    if (draggedDeal && targetColumn) {
      const originalStage = initialDeals.find(d => d.id === draggedId)?.stage.toLowerCase()

      if (originalStage && originalStage !== targetColumn) {
        // If dragging to Lost column, show reason modal first
        if (targetColumn === "lost") {
          setPendingDeal(draggedDeal)
          setLossReasonModalOpen(true)
          setActiveId(null)
          return
        }

        try {
          const result = await updateDealStage(draggedId, targetColumn)
          if (result.success) {
            toast.success(`Moved to ${targetColumn}`)
          } else {
            throw new Error(result.error)
          }
        } catch (err) {
          console.error("Failed to update stage:", err)
          toast.error("Failed to save changes")
          // Revert to original state
          setDeals(initialDeals)
        }
      }
    }

    setActiveId(null)
    // Reset hasDragged after a short delay so the next prop sync works
    setTimeout(() => { hasDragged.current = false }, 500)
  }

  const handleLossReasonConfirm = async (reason: string) => {
    if (!pendingDeal) return

    try {
      const result = await updateDealStage(pendingDeal.id, "lost")
      if (result.success) {
        toast.success("Deal marked as lost")
        // Update the local state to reflect the change
        setDeals(prev => prev.map(deal => 
          deal.id === pendingDeal.id 
            ? { ...deal, stage: "lost" }
            : deal
        ))
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error("Failed to update stage:", err)
      toast.error("Failed to save changes")
      throw err
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
      <div id="kanban-board" className="flex h-full gap-6 overflow-x-auto pb-4 items-start pl-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {COLUMNS.map((col) => {
          const colDeals = columns[col.id] || []

          // Determine label based on industry
          const mapping = industryType ? LABELS[industryType] : LABELS.DEFAULT
          const title = mapping[col.id as keyof typeof mapping] || col.title

          return (
            <div key={col.id} className="w-80 flex-shrink-0 flex flex-col h-full max-h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-[#0F172A] text-sm tracking-wide">{title}</h3>
                  <span className="text-xs text-[#475569] font-bold bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                    {colDeals.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-[#94A3B8] hover:text-[#0F172A]"
                    onClick={() => document.getElementById('new-deal-btn')?.click()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Column Body / Drop Zone - useDroppable wrapper ensures empty columns accept drops */}
              <SortableContext
                id={col.id}
                items={colDeals.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn id={col.id}>
                  {colDeals.length > 0 ? (
                    colDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))
                  ) : (
                    // Empty state
                    <div className="h-40 flex flex-col items-center justify-center text-[#94A3B8] p-4">
                      <div className="p-3 bg-[#F1F5F9] rounded-full mb-3">
                        <Plus className="h-5 w-5 text-[#94A3B8]" />
                      </div>
                      <span className="text-sm font-medium mb-1">No deals</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-[#E2E8F0] rounded-full px-4" onClick={() => document.getElementById('new-deal-btn')?.click()}>
                        Add New
                      </Button>
                    </div>
                  )}
                </DroppableColumn>
              </SortableContext>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeId && activeDeal ? (
          <div className="w-80">
            <DealCard deal={activeDeal} overlay />
          </div>
        ) : null}
      </DragOverlay>

      {/* Loss Reason Modal */}
      {pendingDeal && (
        <LossReasonModal
          open={lossReasonModalOpen}
          onOpenChange={setLossReasonModalOpen}
          deal={{
            id: pendingDeal.id,
            title: pendingDeal.title,
            contactName: pendingDeal.contactName || "Unknown"
          }}
          onConfirm={handleLossReasonConfirm}
        />
      )}
    </DndContext>
  )
}
