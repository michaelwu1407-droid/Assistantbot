"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
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
import {
  DealView,
  persistKanbanColumnOrder,
  updateDealAssignedTo,
  updateDealStage,
} from "@/actions/deal-actions"
import { kanbanColumnIdForDealStage } from "@/lib/kanban-columns"
import { toast } from "sonner"
import { publishCrmSelection } from "@/lib/crm-selection"
import { kanbanStageRequiresScheduledDate } from "@/lib/deal-stage-rules"
import { isNewJobStage } from "@/lib/deal-utils"

// 6 pipeline columns + Deleted jobs. Pending-approval deals appear IN the Completed column with distinct styling.
type ColumnId = "new_request" | "quote_sent" | "scheduled" | "ready_to_invoice" | "completed" | "deleted"

const COLUMNS: { id: ColumnId; title: string; color: string; badgeBg: string; badgeText: string }[] = [
  { id: "new_request", title: "New request", color: "bg-status-new", badgeBg: "bg-status-new", badgeText: "text-white" },
  { id: "quote_sent", title: "Quote sent", color: "bg-status-quote", badgeBg: "bg-status-quote", badgeText: "text-white" },
  { id: "scheduled", title: "Scheduled", color: "bg-status-scheduled", badgeBg: "bg-status-scheduled", badgeText: "text-white" },
  { id: "ready_to_invoice", title: "Awaiting payment", color: "bg-status-awaiting", badgeBg: "bg-status-awaiting", badgeText: "text-white" },
  { id: "completed", title: "Completed", color: "bg-status-complete", badgeBg: "bg-status-complete", badgeText: "text-white" },
  { id: "deleted", title: "Deleted", color: "bg-neutral-400", badgeBg: "bg-neutral-400", badgeText: "text-white" },
]

const BULK_STACK_MAX_VISIBLE = 8
/** Pixels per “step” back — negative translate so cards sit up/left *behind* the dragged card (deck). */
const STACK_OFFSET_PX = 9
const STACK_SCALE_STEP = 0.028

/** Stacked drag preview: active card in front at (0,0); other selected cards peek from behind (up-left). */
function BulkDragOverlay({
  activeId,
  activeDeal,
  bulkDragIds,
  deals,
}: {
  activeId: string
  activeDeal: DealView
  bulkDragIds: string[]
  deals: DealView[]
}) {
  if (bulkDragIds.length <= 1) {
    return (
      <div className="relative w-72">
        <DealCard deal={activeDeal} overlay />
      </div>
    )
  }

  // Backs first (same order as selection, minus active), then active last = on top visually.
  const ordered = bulkDragIds.includes(activeId)
    ? [...bulkDragIds].filter((id) => id !== activeId).concat(activeId)
    : [activeId]

  const total = ordered.length
  const exceeded = total > BULK_STACK_MAX_VISIBLE
  const idsForStack = exceeded
    ? [...ordered.filter((id) => id !== activeId).slice(0, BULK_STACK_MAX_VISIBLE - 1), activeId]
    : ordered

  const hiddenExtra = total - idsForStack.length
  const n = idsForStack.length

  return (
    <div className="relative w-72 overflow-visible drop-shadow-xl">
      {idsForStack.map((id, index) => {
        const deal = deals.find((d) => d.id === id)
        if (!deal) return null
        const isFront = index === n - 1
        const fromBack = n - 1 - index
        const visualDepth = Math.min(fromBack, 6)
        const offset = visualDepth * STACK_OFFSET_PX
        const scale = Math.max(0.82, 1 - visualDepth * STACK_SCALE_STEP)

        return (
          <div
            key={id}
            className={cn(
              "w-72 origin-top-left",
              !isFront && "pointer-events-none absolute left-0 top-0",
              isFront && "relative z-[60]"
            )}
            style={{
              zIndex: isFront ? 60 : index,
              transform: isFront
                ? undefined
                : `translate(${-offset}px, ${-offset}px) scale(${scale})`,
              transformOrigin: "top left",
              opacity: isFront ? 1 : 1 - Math.min(fromBack, 5) * 0.06,
            }}
          >
            <DealCard deal={deal} overlay />
          </div>
        )
      })}
      {hiddenExtra > 0 && (
        <div className="pointer-events-none absolute -right-1 top-0 z-[70] rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground shadow-md">
          +{hiddenExtra}
        </div>
      )}
    </div>
  )
}

interface TeamMemberOption {
  id: string
  name: string | null
  email: string
  role: string
}

interface KanbanBoardProps {
  deals: DealView[]
  industryType?: "TRADES" | "REAL_ESTATE" | null
  filters?: {
    query?: string
    minValue?: string
    maxValue?: string
    startDate?: string
    endDate?: string
    location?: string
    teamMemberId?: string | null
  }
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
    <div className="flex flex-col gap-2">
      <div className={cn("h-[3px] w-full rounded-full", col.color)} />
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {col.id === "ready_to_invoice" ? (
            <h4 className="min-w-0 flex-1 overflow-hidden">
              <HoverScrollName
                text="Awaiting payment"
                className="min-w-0 flex-1"
                textClassName="text-[11px] font-bold uppercase leading-none tracking-wide sm:tracking-wider"
              />
            </h4>
          ) : (
            <h4
              className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase leading-none tracking-wider"
              title={col.title}
            >
              {col.title}
            </h4>
          )}
          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums", col.badgeBg, col.badgeText)}>
            {String(count).padStart(2, "0")}
          </span>
        </div>
        {col.id !== "deleted" && (
          <button
            type="button"
            className="text-muted-foreground/50 transition-colors hover:text-primary"
            onClick={() => openNewDealModalForColumn(col.id)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function openNewDealModalForColumn(columnId: string) {
  window.dispatchEvent(
    new CustomEvent("open-new-deal-modal", {
      detail: {
        initialStage: isNewJobStage(columnId) ? columnId : "new_request",
      },
    })
  )
}

const FILTER_UNASSIGNED = "__unassigned__"

function reorderDealsInColumn(
  prev: DealView[],
  columnId: string,
  activeId: string,
  overId: string
): DealView[] {
  if (activeId === overId) return prev
  const inColumn = prev.filter((d) => kanbanColumnIdForDealStage(d.stage) === columnId)
  const ids = inColumn.map((d) => d.id)
  const oldIndex = ids.indexOf(activeId)
  const newIndex = ids.indexOf(overId)
  if (oldIndex === -1 || newIndex === -1) return prev
  const newIds = arrayMove(ids, oldIndex, newIndex)
  const idSet = new Set(newIds)
  const byId = new Map(prev.map((d) => [d.id, d]))
  const result: DealView[] = []
  let colEmitted = false
  for (const d of prev) {
    if (!idSet.has(d.id)) {
      result.push(d)
    } else if (!colEmitted) {
      for (const id of newIds) {
        const deal = byId.get(id)
        if (deal) result.push(deal)
      }
      colEmitted = true
    }
  }
  return result
}

export function KanbanBoard({
  deals: initialDeals,
  industryType,
  filters,
  teamMembers = [],
  currentUserRole = "TEAM_MEMBER",
  className,
}: KanbanBoardProps) {
  const router = useRouter()
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
  const dragStartColumnRef = useRef<string | null>(null)
  const dealsRef = useRef(deals)
  dealsRef.current = deals
  const dragGroupRef = useRef<string[] | null>(null)
  const dragGroupStagesRef = useRef<Map<string, string>>(new Map())
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [liveMessage, setLiveMessage] = useState("")
  /** Snapshot of selected ids at bulk drag start (for stacked overlay; refs don’t re-render). */
  const [bulkDragIds, setBulkDragIds] = useState<string[]>([])

  // Multi-filter pipeline view: search, value, date, location, and team member.
  const filteredDeals = useMemo(() => {
    let next = deals

    const teamMemberId = filters?.teamMemberId
    if (teamMemberId && teamMemberId !== "__all__") {
      if (teamMemberId === FILTER_UNASSIGNED) {
        next = next.filter((d) => !d.assignedToId)
      } else {
        next = next.filter((d) => d.assignedToId === teamMemberId)
      }
    }

    const query = (filters?.query ?? "").trim().toLowerCase()
    if (query) {
      next = next.filter((d) => {
        const title = d.title?.toLowerCase() ?? ""
        const contact = d.contactName?.toLowerCase() ?? ""
        const address = d.address?.toLowerCase() ?? ""
        return title.includes(query) || contact.includes(query) || address.includes(query)
      })
    }

    const rawMinValue = filters?.minValue?.trim() ?? ""
    const minValue = rawMinValue ? Number(rawMinValue) : null
    const hasMinValue = minValue !== null && Number.isFinite(minValue)
    if (hasMinValue) {
      next = next.filter((d) => Number(d.value ?? 0) >= minValue)
    }

    const rawMaxValue = filters?.maxValue?.trim() ?? ""
    const maxValue = rawMaxValue ? Number(rawMaxValue) : null
    const hasMaxValue = maxValue !== null && Number.isFinite(maxValue)
    if (hasMaxValue) {
      next = next.filter((d) => Number(d.value ?? 0) <= maxValue)
    }

    const location = (filters?.location ?? "").trim().toLowerCase()
    if (location) {
      next = next.filter((d) => (d.address ?? "").toLowerCase().includes(location))
    }

    const hasDateFilter = Boolean(filters?.startDate || filters?.endDate)
    if (hasDateFilter) {
      const datedDeals = deals
        .map((d) => (d.scheduledAt ? new Date(d.scheduledAt) : null))
        .filter((date): date is Date => {
          if (!date) return false
          return !Number.isNaN(date.getTime())
        })
      if (datedDeals.length === 0) {
        return []
      }
      const minScheduled = new Date(Math.min(...datedDeals.map((date) => date.getTime())))
      const maxScheduled = new Date(Math.max(...datedDeals.map((date) => date.getTime())))

      const rangeStart = filters?.startDate ? new Date(`${filters.startDate}T00:00:00`) : null
      const rangeEnd = filters?.endDate ? new Date(`${filters.endDate}T23:59:59`) : null

      // Product requirement: if requested range is outside known kanban scheduled dates, show nothing.
      if ((rangeStart && rangeStart < minScheduled) || (rangeEnd && rangeEnd > maxScheduled)) {
        return []
      }

      next = next.filter((d) => {
        if (!d.scheduledAt) return false
        const scheduled = new Date(d.scheduledAt)
        if (Number.isNaN(scheduled.getTime())) return false
        if (rangeStart && scheduled < rangeStart) return false
        if (rangeEnd && scheduled > rangeEnd) return false
        return true
      })
    }

    return next
  }, [deals, filters])

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

  const handleStageConflict = (result: { success: boolean; error?: string; code?: string }) => {
    if ((result as { code?: string }).code !== "CONFLICT") return false
    toast.error("This card was moved by someone else. Refreshing board...")
    setLiveMessage("This card changed in another session. Board refreshed.")
    setDeals(initialDeals)
    router.refresh()
    return true
  }

  function findColumnForItem(itemId: string): string | undefined {
    if (COLUMNS.some((c) => c.id === itemId)) return itemId
    const deal = dealsRef.current.find((d) => d.id === itemId)
    if (!deal) return undefined
    return kanbanColumnIdForDealStage(deal.stage)
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
      setBulkDragIds([...selectedDealIds])
    } else {
      dragGroupRef.current = null
      dragGroupStagesRef.current = new Map()
      setBulkDragIds([])
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnForItem(activeId)
    const overColumn = findColumnForItem(overId)

    if (!activeColumn || !overColumn) return

    if (activeColumn === overColumn) {
      if (activeId === overId) return
      const groupIds = dragGroupRef.current
      if (groupIds && groupIds.length > 1) return
      setDeals((prev) => reorderDealsInColumn(prev, activeColumn, activeId, overId))
      return
    }

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
    const startedColumn = dragStartColumnRef.current

    const clearDragRefs = () => {
      dragGroupRef.current = null
      dragGroupStagesRef.current = new Map()
      dragStartStageRef.current = null
      dragStartColumnRef.current = null
      setBulkDragIds([])
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
          if (!result.success) {
            if (handleStageConflict(result)) return
            throw new Error(result.error ?? "Failed to save")
          }
        }
        const colTitle = COLUMNS.find((c) => c.id === targetColumn)?.title ?? targetColumn
        toast.success(`Moved ${groupIds.length} jobs to ${colTitle}`)
        setLiveMessage(`Moved ${groupIds.length} jobs to ${colTitle}.`)
      } catch (err) {
        console.error("Failed to update stage:", err)
        toast.error(err instanceof Error ? err.message : "Failed to save changes")
        setLiveMessage("Could not move selected jobs.")
        restoreGroup()
      }
      clearDragRefs()
      setTimeout(() => {
        hasDragged.current = false
      }, 300)
      return
    }

    clearDragRefs()

    if (startedColumn && targetColumn && startedColumn === targetColumn) {
      const orderedIds = dealsRef.current
        .filter((d) => kanbanColumnIdForDealStage(d.stage) === targetColumn)
        .map((d) => d.id)
      if (orderedIds.length > 0) {
        void persistKanbanColumnOrder(targetColumn, orderedIds).then((res) => {
          if (!res.success) toast.error(res.error ?? "Failed to save card order")
        })
      }
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
        setLiveMessage(`Moved to ${colTitle}.`)
      } else {
        if (handleStageConflict(result)) return
        throw new Error(result.error)
      }
    } catch (err) {
      console.error("Failed to update stage:", err)
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
      setLiveMessage("Could not update stage.")
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
        if (!result.success) {
          if (handleStageConflict(result)) return
          throw new Error(result.error ?? "Failed to move")
        }
      }
      setDeals((prev) =>
        prev.map((d) => (idsToDelete.includes(d.id) ? { ...d, stage: "deleted" } : d))
      )
      const n = idsToDelete.length
      toast.success(`Moved ${n} job${n === 1 ? "" : "s"} to Deleted`)
      setLiveMessage(`Moved ${n} jobs to Deleted.`)
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
        if (handleStageConflict(stageRes)) {
          setPendingMoveToScheduled(null)
          return
        }
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
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
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
        {/* Kanban columns — headers locked, cards scroll */}
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {/* Fixed column headers (desktop only) */}
          <div className="hidden shrink-0 md:grid md:grid-cols-6 md:gap-2">
            {COLUMNS.map((col) => {
              const colDeals = columns[col.id] || []
              return (
                <div key={col.id} className="rounded-t-lg bg-black/[0.03] px-2 pb-1 pt-2.5 dark:bg-white/[0.03] md:px-1.5">
                  <KanbanColumnHeader col={col} count={colDeals.length} />
                </div>
              )
            })}
          </div>

          {/* Scrollable card area */}
          <div
            id="kanban-board"
            aria-label="Pipeline board"
            className="kanban-column-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-8 [-webkit-overflow-scrolling:touch]"
          >
            <div className="flex flex-col gap-3 md:grid md:grid-cols-6 md:gap-2 md:items-start">
              {COLUMNS.map((col) => {
                const colDeals = columns[col.id] || []

                return (
                  <div
                    key={col.id}
                    className="kanban-column-panel flex min-w-0 flex-col gap-3 max-md:rounded-lg bg-black/[0.03] px-2 py-2.5 dark:bg-white/[0.03] md:rounded-none md:rounded-b-lg md:px-1.5 md:pt-2"
                  >
                    {/* Mobile: header inline; desktop: header is above scroll area */}
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
                                    if (handleStageConflict(result)) return
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
                            onClick={() => openNewDealModalForColumn(col.id)}
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
          <BulkDragOverlay
            activeId={activeId}
            activeDeal={activeDeal}
            bulkDragIds={bulkDragIds}
            deals={deals}
          />
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
