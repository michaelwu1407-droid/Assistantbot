"use client"

import { useState } from "react"
import type { ActivityView } from "@/actions/activity-actions"
import { cn } from "@/lib/utils"
import { Search, Phone, Mail, FileText, ExternalLink, MessageSquare, ArrowLeft, Bot, Send } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendSMS } from "@/actions/messaging-actions"
import { toast } from "sonner"
import Link from "next/link"

interface InboxViewProps {
  initialInteractions: ActivityView[]
}

const typeLabel: Record<string, string> = {
  call: "Call",
  email: "Email",
  note: "Text / Note",
}

type DetailTab = "conversations" | "activity"
type MessageMode = "travis" | "direct"

function isSystemEvent(a: { title?: string | null; description?: string | null }): boolean {
  const sysPatterns = ["moved to", "stage changed", "status updated", "created deal", "safety check", "sent job complete", "sent on my way", "deal created"]
  return sysPatterns.some(p => (a.title?.toLowerCase().includes(p) || a.description?.toLowerCase().includes(p)))
}

export function InboxView({ initialInteractions }: InboxViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialInteractions[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)

  // RHS detail panel state
  const [detailTab, setDetailTab] = useState<DetailTab>("conversations")
  const [messageMode, setMessageMode] = useState<MessageMode>("travis")
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  // Group interactions by contact
  const contactMap = new Map<string, { name: string; id: string; phone?: string | null; email?: string | null; interactions: ActivityView[] }>()
  for (const a of initialInteractions) {
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
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.interactions.some(i =>
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.content?.toLowerCase().includes(search.toLowerCase())
    )
  )

  // Find the selected contact's data
  const selectedActivity = initialInteractions.find(a => a.id === selectedId)
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

  function iconFor(type: string) {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedContact) return
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
        // Ask Travis - send to chatbot API
        toast.info(`Travis will handle: "${messageText}" for ${selectedContact.name}`)
        setMessageText("")
      }
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full glass-card rounded-2xl overflow-hidden">
      {/* ─── LEFT PANEL: Contact List ──────────────────────── */}
      <div className={cn("w-full md:w-80 border-b md:border-b-0 md:border-r border-border/40 flex flex-col bg-muted/10 shrink-0", selectedActivity && selectedId ? "hidden md:flex" : "flex")}>
        <div className="p-3 border-b border-border/40 space-y-2">
          <h2 className="text-sm font-semibold text-foreground px-1">Contacts</h2>
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
                      if (contact?.interactions[0]) setSelectedId(contact.interactions[0].id)
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
              const latest = contact.interactions[0]
              const isSelected = selectedContactKey === contact.id
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelectedId(latest.id)}
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
                        {latest.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {contact.interactions.length} interaction{contact.interactions.length !== 1 ? "s" : ""}
                    </p>
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
                    <Link href={selectedActivity?.dealId ? `/dashboard/deals/${selectedActivity.dealId}` : `/dashboard/contacts/${selectedContact.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Open</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Conversations / System Activity toggle - inside RHS */}
            <div className="px-4 pt-3 pb-2 border-b border-border/20">
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
                detailInteractions.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground mt-0.5">
                      {iconFor(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-foreground">{item.title}</span>
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      {item.content && (
                        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ─── Bottom: Ask Travis / Direct Message ─────── */}
            <div className="border-t border-border/40 p-3 bg-white/5 shrink-0">
              {/* Mode toggle */}
              <div className="flex bg-muted/30 rounded-lg p-0.5 mb-2 max-w-xs">
                <button
                  onClick={() => setMessageMode("travis")}
                  className={cn("flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5",
                    messageMode === "travis" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Bot className="h-3.5 w-3.5" /> Ask Travis
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
                    ? `Tell Travis what to do with ${selectedContact.name}...`
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
                  disabled={messageMode === "direct" && !selectedContact.phone}
                />
                <Button
                  size="sm"
                  className="h-9 px-3"
                  disabled={!messageText.trim() || sending || (messageMode === "direct" && !selectedContact.phone)}
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {messageMode === "direct" && !selectedContact.phone && (
                <p className="text-[10px] text-red-400 mt-1">No phone number on file — add one to send direct messages.</p>
              )}
              {messageMode === "travis" && (
                <p className="text-[10px] text-muted-foreground mt-1">Travis will handle communication with this customer on your behalf.</p>
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
  )
}
