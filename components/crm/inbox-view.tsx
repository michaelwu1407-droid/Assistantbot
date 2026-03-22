"use client"

import { useMemo, useState, type ReactNode } from "react"
import type { ActivityView } from "@/actions/activity-actions"
import { useShellStore } from "@/lib/store"
import { TUTORIAL_STEPS } from "@/components/tutorial/tutorial-steps"
import { cn } from "@/lib/utils"
import {
  Search,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  ArrowLeft,
  Send,
  SlidersHorizontal,
  ArrowDownAZ,
  Settings,
} from "lucide-react"
/** Direct file import avoids Turbopack HMR stale `bot.js` chunk after swapping Bot → Sparkles on the barrel import. */
import Sparkles from "lucide-react/dist/esm/icons/sparkles"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendSMS } from "@/actions/messaging-actions"
import { toast } from "sonner"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const FAKE_TUTORIAL_INBOX_CONTACT_ID = "tutorial-john-smith"
const FAKE_TUTORIAL_INBOX: ActivityView[] = [
  {
    id: "tutorial-js-1",
    type: "NOTE",
    title: "Inbound",
    description: null,
    time: "2m ago",
    createdAt: new Date(),
    contactId: FAKE_TUTORIAL_INBOX_CONTACT_ID,
    contactName: "John Smith",
    contactPhone: "0412 345 678",
    contactEmail: "john@example.com",
    content: "Hi, I need a quote for bathroom plumbing — leak under the sink.",
  },
  {
    id: "tutorial-js-2",
    type: "NOTE",
    title: "Reply",
    description: null,
    time: "Just now",
    createdAt: new Date(),
    contactId: FAKE_TUTORIAL_INBOX_CONTACT_ID,
    contactName: "John Smith",
    contactPhone: "0412 345 678",
    contactEmail: "john@example.com",
    content: "Thanks John. We'll send a quote by end of day.",
  },
]

/** Lead = no job scheduled or early stage. Existing = has deal in SCHEDULED, PIPELINE, INVOICED, or WON. */
export type ContactSegment = "lead" | "existing"

interface InboxViewProps {
  initialInteractions: ActivityView[]
  /** Map contactId -> "lead" | "existing". Contacts not in map are treated as "lead". */
  contactSegment?: Record<string, ContactSegment>
  /** Required for "Tell Tracey" mode so the chat API can run in the correct workspace. */
  workspaceId?: string
}

const typeLabel: Record<string, string> = {
  call: "Call",
  email: "Email",
  note: "Text / Note",
}

type DetailTab = "conversations" | "activity"
type MessageMode = "travis" | "direct"
type DateFilter = "latest" | "oldest" | "custom"

function isSystemEvent(a: { title?: string | null; description?: string | null }): boolean {
  const sysPatterns = ["moved to", "stage changed", "status updated", "created deal", "safety check", "sent job complete", "sent on my way", "deal created"]
  return sysPatterns.some(p => (a.title?.toLowerCase().includes(p) || a.description?.toLowerCase().includes(p)))
}

/** Most recent activity first (for list row + preview). */
function sortActivitiesByCreatedDesc(activities: ActivityView[]): ActivityView[] {
  return [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function commIconSmall(type: string): ReactNode {
  const t = type?.toLowerCase() ?? ""
  if (t === "call" || t === "voice") {
    return <Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
  }
  if (t === "email") {
    return <Mail className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
  }
  return <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
}

function getInboxListPreviewRow(latest: ActivityView | undefined): { text: string; icon: ReactNode } {
  if (!latest) {
    return {
      text: "No activity yet",
      icon: <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />,
    }
  }
  const raw = [latest.title, latest.content].filter(Boolean).join(" — ").trim() || "Activity"
  const truncated = raw.length > 52 ? `${raw.slice(0, 49)}…` : raw
  const isSystem = isSystemEvent(latest)
  return {
    text: truncated,
    icon: isSystem ? (
      <Settings className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
    ) : (
      commIconSmall(latest.type)
    ),
  }
}

export function InboxView({ initialInteractions, contactSegment = {}, workspaceId }: InboxViewProps) {
  const { viewMode, tutorialStepIndex } = useShellStore()
  const isTutorialInboxStep = viewMode === "TUTORIAL" && TUTORIAL_STEPS[tutorialStepIndex]?.id === "nav-inbox"
  const interactions = isTutorialInboxStep ? [...FAKE_TUTORIAL_INBOX, ...initialInteractions] : initialInteractions

  const [selectedId, setSelectedId] = useState<string | null>(interactions[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [segmentFilter, setSegmentFilter] = useState<ContactSegment | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("latest")
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false)
  const [draftStartDate, setDraftStartDate] = useState("")
  const [draftEndDate, setDraftEndDate] = useState("")
  const [appliedStartDate, setAppliedStartDate] = useState("")
  const [appliedEndDate, setAppliedEndDate] = useState("")

  // RHS detail panel state
  const [detailTab, setDetailTab] = useState<DetailTab>("conversations")
  const [messageMode, setMessageMode] = useState<MessageMode>("direct")
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  // Group interactions by contact
  const contactMap = new Map<string, { name: string; id: string; phone?: string | null; email?: string | null; interactions: ActivityView[] }>()
  for (const a of interactions) {
    const key = a.contactId || a.id
    if (!contactMap.has(key)) {
      contactMap.set(key, {
        name: a.contactName ?? "Unknown",
        id: a.contactId || a.id,
        phone: a.contactPhone,
        email: a.contactEmail,
        interactions: [],
      })
    }
    contactMap.get(key)!.interactions.push(a)
    // Update phone/email if later interaction has it
    if (a.contactPhone) contactMap.get(key)!.phone = a.contactPhone
    if (a.contactEmail) contactMap.get(key)!.email = a.contactEmail
  }

  const contacts = Array.from(contactMap.values())
  const filteredContacts = useMemo(() => {
    const searchLower = search.toLowerCase()
    const startDate = appliedStartDate ? new Date(`${appliedStartDate}T00:00:00`) : null
    const endDate = appliedEndDate ? new Date(`${appliedEndDate}T23:59:59.999`) : null

    const matchesDateFilter = (contact: typeof contacts[number]) => {
      if (dateFilter !== "custom") return true
      return contact.interactions.some((interaction) => {
        const createdAt = new Date(interaction.createdAt)
        if (startDate && createdAt < startDate) return false
        if (endDate && createdAt > endDate) return false
        return true
      })
    }

    const next = contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchLower) ||
        contact.interactions.some((interaction) =>
          interaction.title?.toLowerCase().includes(searchLower) ||
          interaction.content?.toLowerCase().includes(searchLower)
        )

      const matchesSegment =
        segmentFilter === "all" || (contactSegment[contact.id] ?? "lead") === segmentFilter

      return matchesSearch && matchesSegment && matchesDateFilter(contact)
    })

    next.sort((a, b) => {
      const aLatest = Math.max(...a.interactions.map((interaction) => new Date(interaction.createdAt).getTime()))
      const bLatest = Math.max(...b.interactions.map((interaction) => new Date(interaction.createdAt).getTime()))
      return dateFilter === "oldest" ? aLatest - bLatest : bLatest - aLatest
    })

    return next
  }, [contacts, search, segmentFilter, dateFilter, appliedStartDate, appliedEndDate, contactSegment])

  // Find the selected contact's data
  const selectedActivity = interactions.find(a => a.id === selectedId)
  const selectedContactKey = selectedActivity?.contactId || selectedActivity?.id || ""
  const selectedContact = contactMap.get(selectedContactKey)

  // Filter interactions for the RHS based on detail tab
  const detailInteractions = selectedContact
    ? detailTab === "conversations"
      ? selectedContact.interactions.filter(a => !isSystemEvent(a))
      : selectedContact.interactions.filter(a => isSystemEvent(a))
    : []

  // Contact suggestions for the search dropdown
  const contactSuggestions = search.trim().length > 0
    ? filteredContacts.slice(0, 5).map(c => ({ id: c.id, name: c.name }))
    : []

  const applyCustomDates = () => {
    setAppliedStartDate(draftStartDate)
    setAppliedEndDate(draftEndDate)
    setDateFilter("custom")
    setCustomDateDialogOpen(false)
  }

  function channelIconAndStyle(type: string): { icon: ReactNode; containerClass: string; label: string } {
    const t = type?.toLowerCase() ?? ""
    switch (t) {
      case "call":
        return {
          icon: <Phone className="h-4 w-4" />,
          containerClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
          label: "Call",
        }
      case "email":
        return {
          icon: <Mail className="h-4 w-4" />,
          containerClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
          label: "Email",
        }
      case "sms":
        return {
          icon: <MessageCircle className="h-4 w-4" />,
          containerClass: "bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400",
          label: "SMS",
        }
      case "system":
        return {
          icon: <Settings className="h-4 w-4" />,
          containerClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          label: "System",
        }
      case "note":
      default:
        return {
          icon: <MessageSquare className="h-4 w-4" />,
          containerClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
          label: "Message",
        }
    }
  }

  // User/sent messages (reply, outbound) show on the right
  function isOutbound(item: ActivityView) {
    const title = (item.title ?? "").toLowerCase()
    return /^(reply|outbound|sent|sms sent|outbound call|email sent)/i.test(title) || title.includes("reply") || title.includes("outbound")
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return
    if (isTutorialInboxStep && selectedContactKey === FAKE_TUTORIAL_INBOX_CONTACT_ID) {
      toast.info("This is demo data for the tutorial — select a real contact to send messages.")
      return
    }
    setSending(true)

    try {
      if (messageMode === "direct") {
        // Direct SMS via Twilio
        if (!selectedContact.phone) {
          toast.error("No phone number on file for this contact")
          setSending(false)
          return
        }
        const result = await sendSMS(selectedContact.id, messageText)
        if (result.success) {
          toast.success("SMS sent")
          setMessageText("")
        } else {
          toast.error(result.error || "Failed to send")
        }
      } else {
        // Ask Tracey — route through chatbot API (requires workspaceId)
        if (!workspaceId) {
          toast.error("Workspace not loaded. Refresh the page and try again.")
          setSending(false)
          return
        }
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              workspaceId,
              messages: [
                {
                  role: "user",
                  content: `Selected contact in this workspace:
Name: ${selectedContact.name}
Phone: ${selectedContact.phone || "none on file"}
Email: ${selectedContact.email || "none on file"}

User request: ${messageText.trim()}

If the request is to update this contact's CRM details, use the CRM update tools and do not send a message.
If the request is to contact the customer, use the appropriate customer-contact tool.`
                }
              ],
            }),
          })
          if (res.ok) {
            toast.success(`Tracey is handling ${selectedContact.name}`)
            setMessageText("")
          } else {
            const text = await res.text()
            let errMsg = "Tracey couldn't send that message."
            try {
              const err = JSON.parse(text)
              if (err?.error && typeof err.error === "string") errMsg = err.error
            } catch {
              if (text) errMsg = text.slice(0, 120)
            }
            toast.error(errMsg)
          }
        } catch (e) {
          toast.error("Could not reach Tracey. Check your connection and try again.")
          console.error("[Inbox] Ask Tracey request failed:", e)
        }
      }
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="flex flex-col md:flex-row h-full glass-card rounded-2xl overflow-hidden">
        {/* ─── LEFT PANEL: Contact List ──────────────────────── */}
        <div className={cn("w-full md:w-80 border-b md:border-b-0 md:border-r border-border/40 flex flex-col bg-muted/10 shrink-0", selectedActivity && selectedId ? "hidden md:flex" : "flex")}>
          <div className="p-3 border-b border-border/40 space-y-2">
            <h2 className="text-sm font-semibold text-foreground px-1">Contacts</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact type</p>
                <Select value={segmentFilter} onValueChange={(value) => setSegmentFilter(value as ContactSegment | "all")}>
                  <SelectTrigger className="h-9 bg-background/50 border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="lead">Prospect</SelectItem>
                    <SelectItem value="existing">Existing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Date</p>
                <Select
                  value={dateFilter}
                  onValueChange={(value) => {
                    const nextValue = value as DateFilter
                    if (nextValue === "custom") {
                      setDraftStartDate(appliedStartDate)
                      setDraftEndDate(appliedEndDate)
                      setCustomDateDialogOpen(true)
                    } else {
                      setDateFilter(nextValue)
                    }
                  }}
                >
                  <SelectTrigger className="h-9 bg-background/50 border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                      <ArrowDownAZ className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="custom">Custom time period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9 bg-background/50 border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              />
              {/* Contact suggestions dropdown */}
              {searchFocused && contactSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-lg shadow-lg overflow-hidden z-50">
                  <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">Contacts</p>
                  {contactSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        const contact = contactMap.get(c.id)
                        const sorted = contact ? sortActivitiesByCreatedDesc(contact.interactions) : []
                        if (sorted[0]) setSelectedId(sorted[0].id)
                        setSearch("")
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 transition-colors text-left"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-foreground">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No contacts found.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const sorted = sortActivitiesByCreatedDesc(contact.interactions)
                const latest = sorted[0]
                const preview = getInboxListPreviewRow(latest)
                const isSelected = selectedContactKey === contact.id
                return (
                  <button
                    key={contact.id}
                    onClick={() => latest && setSelectedId(latest.id)}
                    className={cn(
                      "w-full text-left p-3 border-b border-border/10 transition-all flex gap-3",
                      isSelected
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "border-l-4 border-l-transparent hover:bg-white/5"
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className={cn(
                          "font-medium truncate text-sm",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {contact.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {latest?.time ?? ""}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-start gap-1.5 min-w-0">
                        <span className="mt-0.5 shrink-0">{preview.icon}</span>
                        <p className="text-xs text-muted-foreground truncate leading-snug" title={preview.text}>
                          {preview.text}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL: Customer Detail ──────────────────── */}
        <div className={cn("flex-1 flex flex-col bg-background/20 backdrop-blur-sm min-w-0", !selectedActivity || !selectedId ? "hidden md:flex" : "flex")}>
          {selectedContact ? (
            <>
              {/* Header: Name + Action buttons */}
              <div className="h-14 border-b border-border/40 flex items-center px-4 justify-between shrink-0 bg-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedId(null)} className="md:hidden h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground text-sm truncate">
                      {selectedContact.name}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedContact.phone || "No phone"} · {selectedContact.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Call button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    title={selectedContact.phone ? `Call ${selectedContact.phone}` : "No phone number"}
                    disabled={!selectedContact.phone}
                    asChild={!!selectedContact.phone}
                  >
                    {selectedContact.phone ? (
                      <a href={`tel:${selectedContact.phone}`}>
                        <Phone className="h-3.5 w-3.5 mr-1 text-blue-500" />
                        <span className="text-xs">Call</span>
                      </a>
                    ) : (
                      <>
                        <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="text-xs">Call</span>
                      </>
                    )}
                  </Button>

                  {/* Email button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    title={selectedContact.email ? `Email ${selectedContact.email}` : "No email address"}
                    disabled={!selectedContact.email}
                    asChild={!!selectedContact.email}
                  >
                    {selectedContact.email ? (
                      <a href={`mailto:${selectedContact.email}`}>
                        <Mail className="h-3.5 w-3.5 mr-1 text-orange-500" />
                        <span className="text-xs">Email</span>
                      </a>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="text-xs">Email</span>
                      </>
                    )}
                  </Button>

                  {/* Text button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    title={selectedContact.phone ? `Text ${selectedContact.phone}` : "No phone number"}
                    disabled={!selectedContact.phone}
                    asChild={!!selectedContact.phone}
                  >
                    {selectedContact.phone ? (
                      <a href={`sms:${selectedContact.phone}`}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1 text-green-500" />
                        <span className="text-xs">Text</span>
                      </a>
                    ) : (
                      <>
                        <MessageSquare className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="text-xs">Text</span>
                      </>
                    )}
                  </Button>

                  {/* Open button */}
                  {(selectedActivity?.dealId || selectedContact.id) && (
                    <Button variant="outline" size="sm" asChild className="h-8 px-2">
                      <Link href={selectedActivity?.dealId ? `/crm/deals/${selectedActivity.dealId}` : `/crm/contacts/${selectedContact.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span className="text-xs">Open</span>
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Conversations / System Activity toggle - inside RHS */}
              <div className="px-4 pt-3 pb-2 border-b-2 border-border/40 mb-1">
                <div className="flex bg-muted/30 rounded-lg p-0.5 max-w-xs">
                  <button
                    onClick={() => setDetailTab("conversations")}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors", detailTab === "conversations" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    Conversations
                  </button>
                  <button
                    onClick={() => setDetailTab("activity")}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors", detailTab === "activity" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    System Activity
                  </button>
                </div>
              </div>

              {/* Interactions list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {detailInteractions.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    {detailTab === "conversations" ? "No conversations yet." : "No system activity."}
                  </div>
                ) : (
                  detailInteractions.map((item) => {
                    const outbound = isOutbound(item)
                    const effectiveType = isSystemEvent(item) ? "system"
                      : (item.title?.toLowerCase().includes("sms") ? "sms" : item.type)
                    const { icon, containerClass, label } = channelIconAndStyle(effectiveType)
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex gap-3 items-start",
                          outbound && "flex-row-reverse justify-end"
                        )}
                      >
                        <div
                          className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", containerClass)}
                          title={label}
                        >
                          {icon}
                        </div>
                        <div className={cn("flex-1 min-w-0 max-w-[85%]", outbound && "flex flex-col items-end")}>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-foreground">{item.title}</span>
                            <span className="text-[10px] text-muted-foreground">{item.time}</span>
                          </div>
                          {item.content && (
                            <p
                              className={cn(
                                "text-sm mt-0.5 whitespace-pre-wrap",
                                outbound ? "text-foreground bg-primary/10 rounded-lg rounded-br-sm px-2.5 py-1.5" : "text-muted-foreground"
                              )}
                            >
                              {item.content}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* ─── Bottom: Ask Tracey / Direct Message ─────── */}
              <div className="border-t border-border/40 p-3 bg-white/5 shrink-0">
                {/* Mode toggle */}
                <div className="flex bg-muted/30 rounded-lg p-0.5 mb-2 max-w-xs">
                  <button
                    onClick={() => setMessageMode("travis")}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5",
                      messageMode === "travis" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Ask Tracey
                  </button>
                  <button
                    onClick={() => setMessageMode("direct")}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5",
                      messageMode === "direct" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Direct Message
                  </button>
                </div>

                {/* Message input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={messageMode === "travis"
                      ? `Tell Tracey what to do with ${selectedContact.name}...`
                      : `Text ${selectedContact.name} directly...`
                    }
                    className="flex-1 bg-background/50 border-border/50"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={(messageMode === "direct" && !selectedContact.phone) || (isTutorialInboxStep && selectedContactKey === FAKE_TUTORIAL_INBOX_CONTACT_ID)}
                  />
                  <Button
                    size="sm"
                    className="h-9 px-3"
                    disabled={!messageText.trim() || sending || (messageMode === "direct" && !selectedContact.phone) || (isTutorialInboxStep && selectedContactKey === FAKE_TUTORIAL_INBOX_CONTACT_ID)}
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {messageMode === "direct" && !selectedContact.phone && (
                  <p className="text-[10px] text-red-400 mt-1">No phone number on file — add one to send direct messages.</p>
                )}
                {messageMode === "direct" && !!selectedContact.phone && (
                  <p className={cn("text-[10px] mt-1 text-right", messageText.length > 160 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                    {messageText.length}/160 characters
                  </p>
                )}
                {messageMode === "travis" && (
                  <p className="text-[10px] text-muted-foreground mt-1">Tracey will handle communication with this customer on your behalf.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                <Search className="w-6 h-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">Select a contact to view their details</p>
            </div>
          )}
        </div>
      </div>
      <Dialog open={customDateDialogOpen} onOpenChange={setCustomDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom time period</DialogTitle>
            <DialogDescription>
              Filter inbox contacts by activity dates, then apply the range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start date</label>
              <Input type="date" value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End date</label>
              <Input type="date" value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDateDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyCustomDates}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
