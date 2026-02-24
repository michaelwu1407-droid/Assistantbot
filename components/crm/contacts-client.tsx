"use client"

import { useState, useMemo } from "react"
import { ContactView } from "@/actions/contact-actions"
import { sendBulkSMS } from "@/actions/messaging-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, X, Phone, Mail, MessageSquare, Filter, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface ContactsClientProps {
  contacts: ContactView[]
}

// Same stages as kanban board (see kanban-board.tsx COLUMNS)
const KANBAN_STAGES: { id: string; title: string }[] = [
  { id: "new_request", title: "New request" },
  { id: "quote_sent", title: "Quote sent" },
  { id: "scheduled", title: "Scheduled" },
  { id: "ready_to_invoice", title: "Awaiting payment" },
  { id: "completed", title: "Completed" },
  { id: "deleted", title: "Deleted jobs" },
]

type SortMode = "alpha" | "last_interacted"
type TypeFilter = "all" | "individual" | "business"

// Prisma DealStage -> kanban column id (matches deal-actions STAGE_MAP)
function prismaStageToColumnId(prismaStage: string | null): string | null {
  if (!prismaStage) return null
  const map: Record<string, string> = {
    NEW: "new_request",
    CONTACTED: "quote_sent",
    NEGOTIATION: "scheduled",
    SCHEDULED: "scheduled",
    PIPELINE: "quote_sent",
    INVOICED: "ready_to_invoice",
    WON: "completed",
    LOST: "lost",
    DELETED: "deleted",
    ARCHIVED: "archived",
  }
  return map[prismaStage] ?? null
}

function formatLastInteracted(date: Date | null): string {
  if (!date) return "—"
  const d = new Date(date)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

export function ContactsClient({ contacts }: ContactsClientProps) {
  const [search, setSearch] = useState("")
  const allStageIds = useMemo(() => new Set(KANBAN_STAGES.map((s) => s.id)), [])
  const [selectedStageIds, setSelectedStageIds] = useState<Set<string>>(new Set(allStageIds))
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMessage, setBulkMessage] = useState("")
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("last_interacted")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const filtered = useMemo(() => {
    let result = contacts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.company?.toLowerCase().includes(q)
      )
    }
    if (selectedStageIds.size === 0) return []
    result = result.filter((c) => {
      const columnId = prismaStageToColumnId(c.primaryDealStageKey ?? null)
      return columnId != null && selectedStageIds.has(columnId)
    })
    // Type filter: individual (no company) vs business (has company)
    if (typeFilter === "individual") {
      result = result.filter((c) => !c.company || c.company.trim() === "")
    } else if (typeFilter === "business") {
      result = result.filter((c) => c.company && c.company.trim() !== "")
    }
    // Sort
    if (sortMode === "alpha") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      result = [...result].sort((a, b) => {
        const aDate = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0
        const bDate = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0
        return bDate - aDate
      })
    }
    return result
  }, [contacts, search, selectedStageIds, sortMode, typeFilter])

  const toggleStage = (stageId: string) => {
    setSelectedStageIds((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((c) => c.id)))
  }

  const handleBulkSMS = async () => {
    if (!bulkMessage.trim() || selected.size === 0) return
    setSending(true)
    try {
      const result = await sendBulkSMS(Array.from(selected), bulkMessage)
      toast.success(`Sent ${result.sent} SMS. ${result.failed} failed.`)
      if (result.errors.length > 0) toast.error(result.errors.slice(0, 3).join(", "))
      setShowBulkModal(false)
      setBulkMessage("")
      setSelected(new Set())
    } catch {
      toast.error("Failed to send bulk SMS")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" className="gap-1.5" onClick={() => setShowBulkModal(true)}>
              <Send className="w-3.5 h-3.5" />
              Send SMS
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5 text-xs min-w-[120px] justify-between",
                selectedStageIds.size < allStageIds.size && "border-primary/50 bg-primary/5"
              )}
            >
              <Filter className="h-3.5 w-3.5 shrink-0" />
              Stages
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Show contacts in:</p>
            </div>
            <div className="max-h-[280px] overflow-y-auto py-1">
              {KANBAN_STAGES.map((col) => (
                <label
                  key={col.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer rounded-sm"
                >
                  <Checkbox
                    checked={selectedStageIds.has(col.id)}
                    onCheckedChange={() => toggleStage(col.id)}
                  />
                  <span className="text-sm">{col.title}</span>
                </label>
              ))}
            </div>
            <div className="p-2 border-t border-border flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedStageIds(new Set(allStageIds))}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedStageIds(new Set())}
              >
                None
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {/* Type filter: Individual / Business */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs min-w-[100px] justify-between"
            >
              <span className="truncate">
                {typeFilter === "all" ? "Type: All" : typeFilter === "individual" ? "Individual" : "Business"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              type="button"
              onClick={() => { setTypeFilter("all"); }}
              className={cn("w-full text-left px-3 py-2 rounded-sm text-sm", typeFilter === "all" && "bg-muted font-medium")}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter("individual"); }}
              className={cn("w-full text-left px-3 py-2 rounded-sm text-sm", typeFilter === "individual" && "bg-muted font-medium")}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter("business"); }}
              className={cn("w-full text-left px-3 py-2 rounded-sm text-sm", typeFilter === "business" && "bg-muted font-medium")}
            >
              Business
            </button>
          </PopoverContent>
        </Popover>
        <Button asChild size="sm">
          <Link href="/dashboard/contacts/new">Add contact</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={selectAll}
                    className="rounded border-input"
                  />
                </th>
                <th
                  className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  onClick={() => setSortMode("alpha")}
                >
                  Name {sortMode === "alpha" && <span className="text-primary text-xs ml-0.5">↓</span>}
                </th>
                <th
                  className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                  onClick={() => setSortMode("last_interacted")}
                >
                  Last interacted {sortMode === "last_interacted" && <span className="text-primary text-xs ml-0.5">↓</span>}
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Job status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Balance</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No contacts found. Add your first contact or try a different search.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded border-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {contact.name}
                      </Link>
                      {contact.company && (
                        <span className="block text-xs text-muted-foreground truncate max-w-[180px]">
                          {contact.company}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                      {formatLastInteracted(contact.lastActivityDate)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-foreground">
                        {contact.primaryDealStage ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">
                      {contact.balanceLabel}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {contact.phone && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              asChild
                              title="Call"
                            >
                              <a href={`tel:${contact.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              asChild
                              title="Text"
                            >
                              <a href={`sms:${contact.phone}`}>
                                <MessageSquare className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        {contact.email && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            asChild
                            title="Email"
                          >
                            <a href={`mailto:${contact.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {!contact.phone && !contact.email && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-xl border bg-card shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Send bulk SMS</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBulkModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Sending to <strong>{selected.size}</strong> contact{selected.size !== 1 ? "s" : ""}. Use {"{{contactName}}"} for personalization.
            </p>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Hi {{contactName}}, just checking in..."
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button disabled={!bulkMessage.trim() || sending} onClick={handleBulkSMS}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {sending ? "Sending…" : `Send to ${selected.size}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
