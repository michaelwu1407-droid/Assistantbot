"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
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
import { DealDetailModal } from "./deal-detail-modal"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DealView, updateDealStage } from "@/actions/deal-actions"
import { toast } from "sonner"

// 6 pipeline columns + Deleted jobs (autoclears after 30 days)
type ColumnId = "new_request" | "quote_sent" | "scheduled" | "pipeline" | "ready_to_invoice" | "completed" | "deleted"

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: "new_request", title: "New request", color: "bg-blue-500" },
  { id: "quote_sent", title: "Quote sent", color: "bg-indigo-500" },
  { id: "scheduled", title: "Scheduled", color: "bg-amber-500" },
  { id: "pipeline", title: "Pipeline", color: "bg-slate-500" },
  { id: "ready_to_invoice", title: "Ready to be invoiced", color: "bg-violet-500" },
  { id: "completed", title: "Completed", color: "bg-primary" },
  { id: "deleted", title: "Deleted jobs", color: "bg-slate-400" },
]

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
      className={`flex-1 bg-[#F8FAFC] rounded-[24px] border border-[#E2E8F0] p-3 overflow-y-auto min-h-[200px] flex flex-col gap-3 transition-colors ${isOver ? "bg-emerald-50 border-emerald-300 shadow-inner" : "hover:bg-white hover:shadow-inner"}`}
    >
      {children}
    </div>
  )
}

export function KanbanBoard({ deals: initialDeals, industryType }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const hasDragged = useRef(false)
  const dragStartStageRef = useRef<string | null>(null)

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
      activationConstraint: { distance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const columns = useMemo(() => {
    const cols: Record<string, DealView[]> = {
      new_request: [],
      quote_sent: [],
      scheduled: [],
      pipeline: [],
      ready_to_invoice: [],
      completed: [],
      deleted: [],
    };
    deals.forEach((deal) => {
      if (cols[deal.stage]) cols[deal.stage].push(deal);
      else cols["new_request"].push(deal);
    });
    return cols;
  }, [deals])

  const activeDeal = useMemo(() =>
    deals.find(d => d.id === activeId),
    [deals, activeId])

  function findColumnForItem(itemId: string): string | undefined {
    // Check if it's a column ID
    if (COLUMNS.some(c => c.id === itemId)) return itemId
    // Otherwise find which column the deal belongs to
    const deal = deals.find(d => d.id === itemId)
    return deal?.stage ?? undefined
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setActiveId(id)
    hasDragged.current = true
    const deal = deals.find((d) => d.id === id)
    dragStartStageRef.current = deal?.stage ?? null
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

    setActiveId(null)
    if (!over) {
      setTimeout(() => { hasDragged.current = false }, 300)
      return
    }

    const overId = String(over.id)
    const draggedDeal = deals.find((d) => d.id === draggedId)
    const targetColumn = findColumnForItem(overId)

    if (!draggedDeal || !targetColumn) {
      setTimeout(() => { hasDragged.current = false }, 300)
      return
    }

    const originalStage = dragStartStageRef.current
    dragStartStageRef.current = null
    if (originalStage === targetColumn) {
      setTimeout(() => { hasDragged.current = false }, 300)
      return
    }

    try {
      const result = await updateDealStage(draggedId, targetColumn)
      if (result.success) {
        setDeals((prev) =>
          prev.map((d) => (d.id === draggedId ? { ...d, stage: targetColumn } : d))
        )
        const colTitle = COLUMNS.find((c) => c.id === targetColumn)?.title ?? targetColumn
        toast.success(`Moved to ${colTitle}`)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error("Failed to update stage:", err)
      toast.error("Failed to save changes")
      setDeals(initialDeals)
    }
    setTimeout(() => { hasDragged.current = false }, 300)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div id="kanban-board" className="flex h-full gap-6 overflow-x-auto pb-4 items-start pl-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {COLUMNS.map((col) => {
          const colDeals = columns[col.id] || []

          // Determine label based on industry
          return (
            <div key={col.id} className="w-60 flex-shrink-0 flex flex-col h-full max-h-full">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-[#0F172A] text-sm tracking-wide">{col.title}</h3>
                  <span className="text-xs text-[#475569] font-bold bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                    {colDeals.length}
                  </span>
                </div>
                {col.id !== "deleted" && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-[#94A3B8] hover:text-[#0F172A]"
                      onClick={() => document.getElementById("new-deal-btn")?.click()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Column Body / Drop Zone */}
              <SortableContext
                id={col.id}
                items={colDeals.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn id={col.id}>
                  {colDeals.length > 0 ? (
                    colDeals.map((deal) => (
                      <DealCard 
                        key={deal.id} 
                        deal={deal} 
                        onOpenModal={() => {
                          setSelectedDealId(deal.id)
                          setModalOpen(true)
                        }}
                        onDelete={async () => {
                          if (!confirm("Move to Deleted jobs? It will be removed after 30 days.")) return
                          try {
                            const result = await updateDealStage(deal.id, "deleted")
                            if (result.success) {
                              setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: "deleted" } : d)))
                              toast.success("Moved to Deleted jobs")
                            } else {
                              toast.error(result.error ?? "Failed to move")
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to move")
                          }
                        }}
                      />
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
          <div className="w-60">
            <DealCard deal={activeDeal} overlay />
          </div>
        ) : null}
      </DragOverlay>

      <DealDetailModal
        dealId={selectedDealId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </DndContext>
  )
}
