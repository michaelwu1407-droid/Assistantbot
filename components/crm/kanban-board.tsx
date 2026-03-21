"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { HoverScrollName } from "@/components/ui/hover-scroll-name"
import { DealDetailModal } from "./deal-detail-modal"
import { Plus, Trash2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DealView, updateDealStage, updateDealAssignedTo } from "@/actions/deal-actions"
import { toast } from "sonner"
import { publishCrmSelection } from "@/lib/crm-selection"
import { kanbanStageRequiresScheduledDate } from "@/lib/deal-stage-rules"

// 6 pipeline columns + Deleted jobs. Pending-approval deals appear IN the Completed column with distinct styling.
type ColumnId = "new_request" | "quote_sent" | "scheduled" | "ready_to_invoice" | "completed" | "deleted"

const COLUMNS: { id: ColumnId; title: string; color: string }[] = [
  { id: "new_request", title: "New request", color: "bg-status-new" },
  { id: "quote_sent", title: "Quote sent", color: "bg-status-quote" },
  { id: "scheduled", title: "Scheduled", color: "bg-status-scheduled" },
  { id: "ready_to_invoice", title: "Awaiting payment", color: "bg-status-awaiting" },
  { id: "completed", title: "Completed", color: "bg-status-complete" },
  { id: "deleted", title: "Deleted", color: "bg-neutral-400" },
]

interface TeamMemberOption {
  id: string
  name: string | null
  email: string
  role: string
}

interface KanbanBoardProps {
  deals: DealView[]
  industryType?: "TRADES" | "REAL_ESTATE" | null
  filterByUserId?: string | null
  teamMembers?: TeamMemberOption[]
  currentUserRole?: string
  className?: string
}

/* ── Droppable Column (cards only; board scroll is on parent) ─────────── */
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 flex-col gap-3 transition-colors",
        isOver ? "bg-primary/5 rounded-lg" : ""
      )}
    >
      {children}
    </div>
  )
}

function KanbanColumnHeader({ col, count }: { col: (typeof COLUMNS)[number]; count: number }) {
  return (
    <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className={cn("h-4 w-1 shrink-0 rounded-full", col.color)} />
        {col.id === "ready_to_invoice" ? (
          <h4 className="min-w-0 flex-1 overflow-hidden">
            <HoverScrollName
              text="Awaiting payment"
              className="min-w-0 flex-1"
              textClassName="text-[10px] font-bold uppercase leading-none tracking-wide sm:text-[11px] sm:tracking-wider"
            />
          </h4>
        ) : (
          <h4
            className="min-w-0 flex-1 truncate font-bold text-[11px] uppercase leading-none tracking-wider"
            title={col.title}
          >
            {col.title}
          </h4>
        )}
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-muted-foreground">
          {String(count).padStart(2, "0")}
        </span>
      </div>
      {col.id !== "deleted" && (
        <button
          type="button"
          className="text-base text-muted-foreground transition-colors hover:text-primary"
          onClick={() => document.getElementById("new-deal-btn")?.click()}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

const FILTER_UNASSIGNED = "__unassigned__"

export function KanbanBoard({
  deals: initialDeals,
  industryType,
  filterByUserId,
  teamMembers = [],
  currentUserRole = "TEAM_MEMBER",
  className,
}: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingMoveToScheduled, setPendingMoveToScheduled] = useState<{ dealId: string; dealTitle: string } | null>(null)
  const [assignModalUserId, setAssignModalUserId] = useState<string>("")
  const [assignModalSubmitting, setAssignModalSubmitting] = useState(false)
  const hasDragged = useRef(false)
  const dragStartStageRef = useRef<string | null>(null)
  const dragGroupRef = useRef<string[] | null>(null)
  const dragGroupStagesRef = useRef<Map<string, string>>(new Map())
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDragCount, setBulkDragCount] = useState(0)

  // Filter deals by assignee when filter is set
  const filteredDeals = useMemo(() => {
    if (!filterByUserId || filterByUserId === "__all__") return deals
    if (filterByUserId === FILTER_UNASSIGNED) return deals.filter((d) => !d.assignedToId)
    return deals.filter((d) => d.assignedToId === filterByUserId)
  }, [deals, filterByUserId])

  // Sync state if props change (re-fetch) - but not during or after drag operations
  useEffect(() => {
    // Only sync if we haven't just completed a drag
    if (!activeId && !hasDragged.current) {
      setDeals(initialDeals)
    }
    // Note: hasDragged is reset in handleDragStart, not here
  }, [initialDeals, activeId])

  useEffect(() => {
    const selection = selectedDealIds.length > 0
      ? selectedDealIds.map((dealId) => ({
        id: dealId,
        title: deals.find((deal) => deal.id === dealId)?.title,
      }))
      : selectedDealId
        ? [{ id: selectedDealId, title: deals.find((deal) => deal.id === selectedDealId)?.title }]
        : []
    publishCrmSelection(selection)
  }, [selectedDealId, selectedDealIds, deals])

  useEffect(() => {
    if (!selectionMode) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest("[data-kanban-card='true']")) return
      if (target.closest("[data-kanban-selection-toolbar]")) return
      setSelectedDealIds([])
      setSelectionMode(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [selectionMode])

  const toggleSelectedDeal = (dealId: string, checked: boolean) => {
    setSelectedDealIds((prev) => {
      if (checked) {
        return prev.includes(dealId) ? prev : [...prev, dealId]
      }
      return prev.filter((id) => id !== dealId)
    })
  }

  const enterSelectionMode = (dealId: string) => {
    setSelectionMode(true)
    setSelectedDealIds((prev) => (prev.includes(dealId) ? prev : [...prev, dealId]))
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
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
      ready_to_invoice: [],
      completed: [],
      deleted: [],
    };
    filteredDeals.forEach((deal) => {
      // Merge legacy "pipeline" stage into "quote_sent"
      let stage = deal.stage === "pipeline" ? "quote_sent" : deal.stage
      // Pending-approval deals appear IN the Completed column (styled differently on the card)
      if (stage === "pending_approval") stage = "completed"
      if (cols[stage]) cols[stage].push(deal);
      else cols["new_request"].push(deal);
    });
    return cols;
  }, [filteredDeals])

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

    if (
      selectionMode &&
      selectedDealIds.length > 1 &&
      selectedDealIds.includes(id)
    ) {
      dragGroupRef.current = [...selectedDealIds]
      const snap = new Map<string, string>()
      for (const gid of selectedDealIds) {
        const d = deals.find((x) => x.id === gid)
        if (d) snap.set(gid, d.stage)
      }
      dragGroupStagesRef.current = snap
      setBulkDragCount(selectedDealIds.length)
    } else {
      dragGroupRef.current = null
      dragGroupStagesRef.current = new Map()
      setBulkDragCount(0)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnForItem(activeId)
    const overColumn = findColumnForItem(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    const groupIds = dragGroupRef.current
    if (groupIds && groupIds.length > 1) {
      setDeals((prev) => {
        for (const gid of groupIds) {
          const moving = prev.find((d) => d.id === gid)
          if (!moving) return prev
          if (kanbanStageRequiresScheduledDate(overColumn) && !moving.scheduledAt) return prev
          if (overColumn === "scheduled" && !moving.assignedToId) return prev
        }
        return prev.map((d) => (groupIds.includes(d.id) ? { ...d, stage: overColumn } : d))
      })
      return
    }

    setDeals((prev) => {
      const activeIndex = prev.findIndex((d) => d.id === activeId)
      if (activeIndex === -1) return prev

      const moving = prev[activeIndex]
      if (
        kanbanStageRequiresScheduledDate(overColumn) &&
        !moving.scheduledAt
      ) {
        return prev
      }
      if (overColumn === "scheduled" && !moving.assignedToId) {
        return prev
      }

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
    const groupIds = dragGroupRef.current
    const groupSnapshot = new Map(dragGroupStagesRef.current)
    const singleOriginalStage = dragStartStageRef.current

    const clearDragRefs = () => {
      dragGroupRef.current = null
      dragGroupStagesRef.current = new Map()
      dragStartStageRef.current = null
      setBulkDragCount(0)
    }

    const restoreGroup = () => {
      if (!groupIds || groupIds.length <= 1) return
      setDeals((prev) =>
        prev.map((d) => {
          const orig = groupSnapshot.get(d.id)
          return orig !== undefined && groupIds.includes(d.id) ? { ...d, stage: orig } : d
        })
      )
    }

    setActiveId(null)

    if (!over) {
      if (groupIds && groupIds.length > 1) {
        restoreGroup()
      } else if (singleOriginalStage) {
        setDeals((prev) => prev.map((d) => (d.id === draggedId ? { ...d, stage: singleOriginalStage } : d)))
      }
      clearDragRefs()
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    const overId = String(over.id)
    const targetColumn = findColumnForItem(overId)
    const draggedDeal = deals.find((d) => d.id === draggedId)

    if (!draggedDeal || !targetColumn) {
      if (groupIds && groupIds.length > 1) {
        restoreGroup()
      } else if (singleOriginalStage) {
        setDeals((prev) => prev.map((d) => (d.id === draggedId ? { ...d, stage: singleOriginalStage } : d)))
      }
      clearDragRefs()
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    // Multi-select: move every selected card to the target column together
    if (groupIds && groupIds.length > 1) {
      const anyMoved = groupIds.some((id) => groupSnapshot.get(id) !== targetColumn)
      if (!anyMoved) {
        clearDragRefs()
        setTimeout(() => {
          hasDragged.current = false
        }, 300)
        return
      }

      for (const gid of groupIds) {
        const d = deals.find((x) => x.id === gid)
        if (!d) continue
        if (kanbanStageRequiresScheduledDate(targetColumn) && !d.scheduledAt) {
          restoreGroup()
          toast.error("Set a scheduled date on each job before moving here.")
          clearDragRefs()
          setTimeout(() => {
            hasDragged.current = false
          }, 300)
          return
        }
        if (targetColumn === "scheduled" && !d.assignedToId) {
          restoreGroup()
          toast.error("Assign a team member to each job before moving to Scheduled.")
          clearDragRefs()
          setTimeout(() => {
            hasDragged.current = false
          }, 300)
          return
        }
      }

      try {
        for (const gid of groupIds) {
          const result = await updateDealStage(gid, targetColumn)
          if (!result.success) throw new Error(result.error ?? "Failed to save")
        }
        const colTitle = COLUMNS.find((c) => c.id === targetColumn)?.title ?? targetColumn
        toast.success(`Moved ${groupIds.length} jobs to ${colTitle}`)
      } catch (err) {
        console.error("Failed to update stage:", err)
        toast.error(err instanceof Error ? err.message : "Failed to save changes")
        restoreGroup()
      }
      clearDragRefs()
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    clearDragRefs()

    if (singleOriginalStage === targetColumn) {
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    if (kanbanStageRequiresScheduledDate(targetColumn) && !draggedDeal.scheduledAt) {
      if (singleOriginalStage) {
        setDeals((prev) => prev.map((d) => (d.id === draggedId ? { ...d, stage: singleOriginalStage } : d)))
      }
      toast.error("Set a scheduled date on the job before moving it here.")
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    if (targetColumn === "scheduled" && !draggedDeal.assignedToId) {
      setPendingMoveToScheduled({ dealId: draggedId, dealTitle: draggedDeal.title })
      setAssignModalUserId(teamMembers.length > 0 ? teamMembers[0].id : "")
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    try {
      setDeals((prev) => prev.map((d) => (d.id === draggedId ? { ...d, stage: targetColumn } : d)))

      const result = await updateDealStage(draggedId, targetColumn)
      if (result.success) {
        const colTitle = COLUMNS.find((c) => c.id === targetColumn)?.title ?? targetColumn
        toast.success(`Moved to ${colTitle}`)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      console.error("Failed to update stage:", err)
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
      setDeals(initialDeals)
    }
    setTimeout(() => {
      hasDragged.current = false
    }, 300)
  }

  const handleBulkDeleteToDeleted = async () => {
    const idsToDelete = [...selectedDealIds]
    if (idsToDelete.length === 0) return
    try {
      for (const id of idsToDelete) {
        const result = await updateDealStage(id, "deleted")
        if (!result.success) throw new Error(result.error ?? "Failed to move")
      }
      setDeals((prev) =>
        prev.map((d) => (idsToDelete.includes(d.id) ? { ...d, stage: "deleted" } : d))
      )
      const n = idsToDelete.length
      toast.success(`Moved ${n} job${n === 1 ? "" : "s"} to Deleted`)
      setSelectedDealIds([])
      setSelectionMode(false)
      setBulkDeleteOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to delete")
      setDeals(initialDeals)
    }
  }

  const handleAssignAndMoveToScheduled = async () => {
    if (!pendingMoveToScheduled || !assignModalUserId) {
      toast.error("Select a team member to assign.")
      return
    }
    const dealForSchedule = deals.find((d) => d.id === pendingMoveToScheduled.dealId)
    if (!dealForSchedule?.scheduledAt) {
      toast.error("Add a scheduled date on the job before moving it to Scheduled.")
      return
    }
    setAssignModalSubmitting(true)
    try {
      const assignRes = await updateDealAssignedTo(pendingMoveToScheduled.dealId, assignModalUserId)
      if (!assignRes.success) {
        toast.error(assignRes.error ?? "Failed to assign")
        setAssignModalSubmitting(false)
        return
      }
      const stageRes = await updateDealStage(pendingMoveToScheduled.dealId, "scheduled")
      if (stageRes.success) {
        const name = teamMembers.find((m) => m.id === assignModalUserId)?.name || "Someone"
        setDeals((prev) =>
          prev.map((d) =>
            d.id === pendingMoveToScheduled.dealId
              ? { ...d, stage: "scheduled" as const, assignedToId: assignModalUserId, assignedToName: name }
              : d
          )
        )
        toast.success(`Assigned to ${name} and moved to Scheduled`)
        setPendingMoveToScheduled(null)
      } else {
        toast.error(stageRes.error ?? "Failed to move")
      }
    } catch (err) {
      toast.error("Something went wrong")
    } finally {
      setAssignModalSubmitting(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("flex min-h-0 flex-1 flex-col", className)} ref={boardRef}>
        <style jsx global>{`
          @keyframes kanban-card-wiggle {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            25% { transform: translate3d(0, -1px, 0) rotate(-0.6deg); }
            75% { transform: translate3d(0, 1px, 0) rotate(0.6deg); }
          }
        `}</style>
        {selectionMode && (
          <div
            data-kanban-selection-toolbar
            className="mb-2 flex shrink-0 items-center justify-between gap-2"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {selectedDealIds.length > 0
                ? `${selectedDealIds.length} job${selectedDealIds.length === 1 ? "" : "s"} selected`
                : "Tap cards to select"}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                disabled={selectedDealIds.length === 0}
                title="Move selected to Deleted"
                aria-label="Move selected jobs to Deleted"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setSelectedDealIds([])
                  setSelectionMode(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {/* md+: frozen column titles; single vertical scroll for all card columns */}
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="bg-[var(--main-canvas)]/98 hidden shrink-0 border-b border-border/10 pb-2 pt-1 md:grid md:grid-cols-6 md:gap-4">
            {COLUMNS.map((col) => {
              const colDeals = columns[col.id] || []
              return <KanbanColumnHeader key={`hdr-${col.id}`} col={col} count={colDeals.length} />
            })}
          </div>
          <div
            id="kanban-board"
            className="kanban-column-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-8 [-webkit-overflow-scrolling:touch]"
          >
            <div className="flex flex-col gap-6 md:grid md:grid-cols-6 md:gap-4 md:items-start">
              {COLUMNS.map((col) => {
                const colDeals = columns[col.id] || []

                return (
                  <div key={col.id} className="flex min-w-0 flex-col gap-3">
                    <div className="md:hidden">
                      <KanbanColumnHeader col={col} count={colDeals.length} />
                    </div>
                    <SortableContext
                      id={col.id}
                      items={colDeals.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <DroppableColumn id={col.id}>
                        {colDeals.length > 0 ? (
                          colDeals.map((deal) => (
                            <DealCard
                              key={deal.id}
                              deal={deal}
                              columnId={col.id}
                              currentUserRole={currentUserRole}
                              teamMembers={teamMembers}
                              isSelected={selectedDealIds.includes(deal.id)}
                              selectionMode={selectionMode}
                              onToggleSelected={toggleSelectedDeal}
                              onEnterSelectionMode={enterSelectionMode}
                              onAssign={
                                teamMembers.length > 0
                                  ? async (userId) => {
                                      const result = await updateDealAssignedTo(deal.id, userId)
                                      if (result.success) {
                                        const name = userId
                                          ? teamMembers.find((m) => m.id === userId)?.name || "Someone"
                                          : null
                                        setDeals((prev) =>
                                          prev.map((d) =>
                                            d.id === deal.id
                                              ? {
                                                  ...d,
                                                  assignedToId: userId ?? undefined,
                                                  assignedToName: name ?? undefined,
                                                }
                                              : d
                                          )
                                        )
                                        toast.success(userId ? `Assigned to ${name}` : "Unassigned")
                                      } else {
                                        toast.error(result.error ?? "Failed to assign")
                                      }
                                    }
                                  : undefined
                              }
                              onOpenModal={() => {
                                setSelectedDealId(deal.id)
                                setModalOpen(true)
                              }}
                              onDelete={async () => {
                                try {
                                  const result = await updateDealStage(deal.id, "deleted")
                                  if (result.success) {
                                    setDeals((prev) =>
                                      prev.map((d) => (d.id === deal.id ? { ...d, stage: "deleted" } : d))
                                    )
                                    toast.success("Moved to Deleted")
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
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/30 py-2 text-[11px] font-bold text-muted-foreground/50 transition-all hover:border-primary/50 hover:text-primary"
                            onClick={() => document.getElementById("new-deal-btn")?.click()}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {col.id === "new_request" ? "Add your first deal" : "Add Card"}
                          </button>
                        )}
                      </DroppableColumn>
                    </SortableContext>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeDeal ? (
          <div className="w-72 relative">
            {bulkDragCount > 1 && (
              <div className="absolute -top-2 -right-2 z-10 rounded-full bg-primary text-primary-foreground text-[11px] font-bold min-w-[22px] h-[22px] flex items-center justify-center px-1 shadow-md border border-background">
                {bulkDragCount}
              </div>
            )}
            <DealCard deal={activeDeal} overlay />
          </div>
        ) : null}
      </DragOverlay>

      <DealDetailModal
        dealId={selectedDealId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentUserRole={currentUserRole}
        onDealUpdated={() => setDeals(initialDeals)}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedDealIds.length} job{selectedDealIds.length === 1 ? "" : "s"} to Deleted?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected jobs will go to the Deleted column. They are removed permanently after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void handleBulkDeleteToDeleted()
              }}
            >
              Move to Deleted
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign team member before moving to Scheduled */}
      <Dialog open={!!pendingMoveToScheduled} onOpenChange={(open) => !open && setPendingMoveToScheduled(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Assign team member
            </DialogTitle>
            <DialogDescription>
              A team member must be assigned before a job can be in Scheduled. {pendingMoveToScheduled && `Assign someone to move "${pendingMoveToScheduled.dealTitle}" to Scheduled.`}
            </DialogDescription>
          </DialogHeader>
          {teamMembers.length > 0 ? (
            <div className="grid gap-4 py-2">
              <Label>Assigned to</Label>
              <Select value={assignModalUserId} onValueChange={setAssignModalUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">
              Add team members in Settings → Team first, then you can assign them to jobs.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMoveToScheduled(null)} disabled={assignModalSubmitting}>
              Cancel
            </Button>
            {teamMembers.length > 0 && (
              <Button onClick={handleAssignAndMoveToScheduled} disabled={assignModalSubmitting || !assignModalUserId}>
                {assignModalSubmitting ? "Saving…" : "Assign & move to Scheduled"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}
