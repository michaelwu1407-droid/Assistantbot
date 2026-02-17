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

export function KanbanBoard({ deals: initialDeals, industryType }: KanbanBoardProps) {
  const [deals, setDeals] = useState<DealView[]>(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const hasDragged = useRef(false)

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
        distance: 5 // Drag starts after 5px movement
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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    hasDragged.current = true
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the containers (stages)
    const activeDeal = deals.find(d => d.id === activeId)
    const overDeal = deals.find(d => d.id === overId)

    if (!activeDeal) return

    const activeStage = activeDeal.stage.toLowerCase()
    const overStage = overDeal
      ? overDeal.stage.toLowerCase()
      : (COLUMNS.find(c => c.id === overId)?.id || activeStage) // Drop on column header/empty space

    if (activeStage !== overStage) {
      setDeals((prev) => {
        const activeIndex = prev.findIndex((d) => d.id === activeId)
        const overIndex = overDeal ? prev.findIndex((d) => d.id === overId) : prev.length // End of list if empty

        // Clone and update stage instantly for visual feedback
        const newDeals = [...prev]
        newDeals[activeIndex] = {
          ...newDeals[activeIndex],
          stage: overStage
        }

        // Move in array to correct relative position (optional for simple lists, but good for sort)
        return arrayMove(newDeals, activeIndex, overIndex)
      })
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeId = active.id as string

    if (!over) {
      setActiveId(null)
      return
    }

    const overId = over.id as string

    const activeDeal = deals.find(d => d.id === activeId)

    const activeStage = activeDeal?.stage.toLowerCase()
    // If dropping on a container ID directly (empty column) vs a card ID
    const overStage = COLUMNS.find(c => c.id === overId)?.id ||
      deals.find(d => d.id === overId)?.stage.toLowerCase()

    if (activeDeal && overStage && activeStage !== overStage) {
      // It's already moved visually in handleDragOver, just persist here
      try {
        const result = await updateDealStage(activeId, overStage)
        if (result.success) {
          toast.success(`Moved to ${overStage}`)
        } else {
          throw new Error(result.error)
        }
      } catch (err) {
        console.error("Failed to update stage:", err)
        toast.error("Failed to save changes")
        // Ideally revert state here, but for now we rely on next refresh
      }
    }

    setActiveId(null)
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
                  <div className={`w-2 h-2 rounded-full ring-2 ring-opacity-50 ring-offset-1 ${col.color.replace('bg-', 'ring-')}`} />
                  <h3 className="font-semibold text-foreground text-sm tracking-tight">{title}</h3>
                  <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
                    {colDeals.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Column Body / Drop Zone */}
              {/* We make the whole column a sortable context */}
              <SortableContext
                id={col.id} // This is critical for empty columns to be droppable
                items={colDeals.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 bg-muted/10 dark:bg-white/5 rounded-2xl border border-dashed border-border/30 p-2 overflow-y-auto min-h-[150px] flex flex-col gap-3 transition-colors hover:bg-muted/20">
                  {colDeals.length > 0 ? (
                    colDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))
                  ) : (
                    // Empty state
                    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground p-4 opacity-50 hover:opacity-100 transition-opacity">
                      <div className="p-3 bg-muted/30 rounded-full mb-3">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium mb-1">No deals</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-white/10" onClick={() => document.getElementById('new-deal-btn')?.click()}>
                        Add New
                      </Button>
                    </div>
                  )}
                </div>
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
    </DndContext>
  )
}
