"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Filter, Mail, MessageSquare, Phone, Search, X } from "lucide-react"
import { toast } from "sonner"

import { ContactView, deleteContacts } from "@/actions/contact-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { cn } from "@/lib/utils"

interface ContactsClientProps {
  contacts: ContactView[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

const KANBAN_STAGES: { id: string; title: string }[] = [
  { id: "new_request", title: "New request" },
  { id: "quote_sent", title: "Quote sent" },
  { id: "scheduled", title: "Scheduled" },
  { id: "ready_to_invoice", title: "Awaiting payment" },
  { id: "completed", title: "Completed" },
  { id: "lost", title: "Lost" },
  { id: "deleted", title: "Deleted" },
]

type SortMode = "alpha" | "last_interacted"
type TypeFilter = "all" | "individual" | "business"

function prismaStageToColumnId(prismaStage: string | null): string | null {
  if (!prismaStage) return null

  const map: Record<string, string> = {
    NEW: "new_request",
    CONTACTED: "quote_sent",
    NEGOTIATION: "scheduled",
    SCHEDULED: "scheduled",
    PIPELINE: "quote_sent",
    INVOICED: "ready_to_invoice",
    PENDING_COMPLETION: "completed",
    WON: "completed",
    LOST: "lost",
    DELETED: "deleted",
    ARCHIVED: "deleted",
  }

  return map[prismaStage] ?? null
}

function formatLastContact(date: Date | null): string {
  if (!date) return "-"

  const contactDate = new Date(date)
  const now = new Date()
  const days = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) {
    return contactDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  return contactDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

export function ContactsClient({ contacts, pagination }: ContactsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const allStageIds = useMemo(() => new Set(KANBAN_STAGES.map((stage) => stage.id)), [])
  const [selectedStageIds, setSelectedStageIds] = useState<Set<string>>(new Set(allStageIds))
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("last_interacted")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const filtered = useMemo(() => {
    let result = contacts

    if (search) {
      const query = search.toLowerCase()
      result = result.filter((contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.primaryDealTitle?.toLowerCase().includes(query)
      )
    }

    if (selectedStageIds.size === 0) {
      return []
    }

    result = result.filter((contact) => {
      // Contacts with no primary deal are not stage-filtered — always include them
      if (!contact.primaryDealStageKey) return true
      const columnId = prismaStageToColumnId(contact.primaryDealStageKey)
      // If the stage doesn't map to a known column, show the contact regardless
      if (columnId == null) return true
      return selectedStageIds.has(columnId)
    })

    if (typeFilter === "individual") {
      result = result.filter((contact) => !contact.company || contact.company.trim() === "")
    } else if (typeFilter === "business") {
      result = result.filter((contact) => Boolean(contact.company && contact.company.trim() !== ""))
    }

    if (sortMode === "alpha") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return [...result].sort((a, b) => {
      const aDate = a.lastActivityDate ? new Date(a.lastActivityDate).getTime() : 0
      const bDate = b.lastActivityDate ? new Date(b.lastActivityDate).getTime() : 0
      return bDate - aDate
    })
  }, [contacts, search, selectedStageIds, sortMode, typeFilter])

  const hasActiveClientFilters =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    selectedStageIds.size !== allStageIds.size

  const toggleStage = (stageId: string) => {
    setSelectedStageIds((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
      return
    }

    setSelected(new Set(filtered.map((contact) => contact.id)))
  }

  const handleDelete = async () => {
    const selectedCount = selected.size
    setSending(true)
    try {
      const result = await deleteContacts(Array.from(selected))
      if (result?.success === false) {
        throw new Error(result.error || "Failed to delete contacts")
      }
      toast.success(`Deleted ${selectedCount} contact${selectedCount === 1 ? "" : "s"}`)
      setSelected(new Set())
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete contacts")
    } finally {
      setSending(false)
    }
  }

  const handleExport = () => {
    const selectedContacts = filtered.filter((contact) => selected.has(contact.id))
    const headers = ["Name", "Email", "Phone", "Company", "Address", "Deals", "Balance", "Tags"]
    const csvContent = [
      headers.join(","),
      ...selectedContacts.map((contact) => {
        const tags = Array.isArray(contact.metadata?.tags) ? contact.metadata.tags.join(";") : ""
        return [
          `"${contact.name.replace(/"/g, '""')}"`,
          `"${(contact.email || "").replace(/"/g, '""')}"`,
          `"${(contact.phone || "").replace(/"/g, '""')}"`,
          `"${(contact.company || "").replace(/"/g, '""')}"`,
          `"${(contact.address || "").replace(/"/g, '""')}"`,
          contact.dealCount,
          `"${contact.balanceLabel.replace(/"/g, '""')}"`,
          `"${tags.replace(/"/g, '""')}"`
        ].join(",")
      })
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `contacts_export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadgeClass = (stage: string | null) => {
    switch (stage) {
      case "Completed":
        return "border-emerald-200 bg-emerald-50 text-emerald-700"
      case "Awaiting payment":
        return "border-amber-200 bg-amber-50 text-amber-700"
      case "Scheduled":
        return "border-sky-200 bg-sky-50 text-sky-700"
      case "Quote sent":
        return "border-violet-200 bg-violet-50 text-violet-700"
      case "New request":
        return "border-slate-200 bg-slate-100 text-slate-700"
      default:
        return "border-slate-200 bg-slate-100 text-slate-600"
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="mr-1 text-sm text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExport}>
                  Export CSV
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setDeleteDialogOpen(true)} disabled={sending}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelected(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="toolbar"
                  className={cn(
                    "min-w-[120px] justify-between gap-1.5 text-sm",
                    selectedStageIds.size < allStageIds.size && "border-primary/50 bg-primary/5"
                  )}
                >
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  Stages
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="border-b border-border p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Show contacts in:</p>
                </div>
                <div className="max-h-[280px] overflow-y-auto py-1">
                  {KANBAN_STAGES.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedStageIds.has(column.id)}
                        onCheckedChange={() => toggleStage(column.id)}
                      />
                      <span className="text-sm">{column.title}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-1 border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedStageIds(new Set(allStageIds))}
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedStageIds(new Set())}
                  >
                    None
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="toolbar" className="min-w-[120px] justify-between gap-1.5 text-sm">
                  <span className="truncate">
                    {typeFilter === "all" ? "Type: All" : typeFilter === "individual" ? "Individual" : "Business"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={cn("w-full rounded-sm px-3 py-2 text-left text-sm", typeFilter === "all" && "bg-muted font-medium")}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("individual")}
                  className={cn("w-full rounded-sm px-3 py-2 text-left text-sm", typeFilter === "individual" && "bg-muted font-medium")}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("business")}
                  className={cn("w-full rounded-sm px-3 py-2 text-left text-sm", typeFilter === "business" && "bg-muted font-medium")}
                >
                  Business
                </button>
              </PopoverContent>
            </Popover>

            <Button asChild size="sm">
              <Link href="/crm/contacts/new">Add contact</Link>
            </Button>
          </div>

          {!pagination && (
            <p className="text-xs text-muted-foreground">
              {`${filtered.length} ${filtered.length === 1 ? "contact" : "contacts"}`}
            </p>
          )}

          <div className="overflow-hidden rounded-[18px] border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-neutral-200 bg-muted/50">
                    <th className="w-10 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onChange={selectAll}
                        className="rounded border-input"
                      />
                    </th>
                    <th
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setSortMode("alpha")}
                    >
                      Name {sortMode === "alpha" && <span className="ml-0.5 text-xs text-primary">↓</span>}
                    </th>
                    <th
                      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setSortMode("last_interacted")}
                    >
                      Last contact {sortMode === "last_interacted" && <span className="ml-0.5 text-xs text-primary">↓</span>}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last job</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Job status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Balance</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No contacts found. Add your first contact or try a different search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-b border-border/50 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="rounded border-input"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/crm/contacts/${contact.id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {contact.name}
                          </Link>
                          {contact.company && (
                            <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
                              {contact.company}
                            </span>
                          )}
                          {contact.metadata?.tags && Array.isArray(contact.metadata.tags) && contact.metadata.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {contact.metadata.tags.map((tag) => (
                                <span
                                  key={String(tag)}
                                  className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary"
                                >
                                  {String(tag)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatLastContact(contact.lastActivityDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="block max-w-[220px] truncate text-sm font-medium text-neutral-900">{contact.primaryDealTitle ?? "-"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {contact.primaryDealStage ? (
                            <Badge variant="outline" className={cn("rounded-full text-xs font-medium", getStatusBadgeClass(contact.primaryDealStage))}>
                              {contact.primaryDealStage}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{contact.balanceLabel}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {contact.phone && (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild title="Call">
                                  <a href={`tel:${contact.phone}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild title="Text">
                                  <a href={`sms:${contact.phone}`}>
                                    <MessageSquare className="h-4 w-4" />
                                  </a>
                                </Button>
                              </>
                            )}
                            {contact.email && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild title="Email">
                                <a href={`mailto:${contact.email}`}>
                                  <Mail className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {!contact.phone && !contact.email && (
                              <span className="text-xs text-muted-foreground">-</span>
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

          {pagination && (
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {hasActiveClientFilters
                  ? `Matches on this page: ${filtered.length} of ${contacts.length} loaded · ${pagination.total} contacts in workspace · page ${pagination.page}`
                  : `Showing ${contacts.length} of ${pagination.total} contacts (page ${pagination.page})`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => {
                    if (!pagination.hasPrevPage) return
                    router.push(`/crm/contacts?page=${pagination.page - 1}`)
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasNextPage}
                  onClick={() => {
                    if (!pagination.hasNextPage) return
                    router.push(`/crm/contacts?page=${pagination.page + 1}`)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} contact{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected contact records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={sending}
              className="bg-red-600 hover:bg-red-700"
            >
              {sending ? "Deleting..." : "Delete contacts"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
