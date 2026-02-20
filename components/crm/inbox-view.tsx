"use client"

import { useState } from "react"
import type { ActivityView } from "@/actions/activity-actions"
import { cn } from "@/lib/utils"
import { Search, Phone, Mail, FileText, ExternalLink, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface InboxViewProps {
  initialInteractions: ActivityView[]
}

const typeLabel: Record<string, string> = {
  call: "Call",
  email: "Email",
  note: "Text / Note",
}

export function InboxView({ initialInteractions }: InboxViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialInteractions[0]?.id ?? null)
  const [search, setSearch] = useState("")

  const filtered = initialInteractions.filter(
    (a) =>
      (a.contactName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (a.title?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (a.content?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const selected = initialInteractions.find((a) => a.id === selectedId)

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

  return (
    <div className="flex h-full glass-card rounded-2xl overflow-hidden">
      {/* List: email-like */}
      <div className="w-96 border-r border-border/40 flex flex-col bg-muted/10 shrink-0">
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search interactions..."
              className="pl-9 bg-background/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No interactions found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full text-left p-3 border-b border-border/10 transition-all flex gap-3",
                  selectedId === item.id
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "border-l-4 border-l-transparent hover:bg-white/5"
                )}
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  {iconFor(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={cn(
                      "font-medium truncate text-sm",
                      selectedId === item.id ? "text-primary" : "text-foreground"
                    )}>
                      {item.contactName ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {typeLabel[item.type] ?? item.type} — {item.title}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail: messages for text, body for email, summary for call */}
      <div className="flex-1 flex flex-col bg-background/20 backdrop-blur-sm min-w-0">
        {selected ? (
          <>
            <div className="h-14 border-b border-border/40 flex items-center px-4 justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {iconFor(selected.type)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground text-sm truncate">
                    {selected.contactName ?? "Unknown"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {typeLabel[selected.type] ?? selected.type} · {selected.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selected.contactId && (
                  <>
                    <Button variant="outline" size="sm" asChild className="h-8 px-2" title="Call Contact">
                      <a href={`tel:${selected.contactId}`}>
                        <Phone className="h-3.5 w-3.5 mr-1 text-blue-500" />
                        <span className="text-xs">Call</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="h-8 px-2" title="Text Contact">
                      <a href={`sms:${selected.contactId}`}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        <span className="text-xs">Text</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="h-8 px-2 hidden sm:flex" title="Email Contact">
                      <a href={`mailto:${selected.contactId}`}>
                        <Mail className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        <span className="text-xs">Email</span>
                      </a>
                    </Button>
                  </>
                )}
                {(selected.dealId || selected.contactId) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={selected.dealId ? `/dashboard/deals/${selected.dealId}` : `/dashboard/contacts/${selected.contactId}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Open
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selected.type === "call" && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Call summary</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.content ?? selected.description ?? "—"}</p>
                </div>
              )}
              {selected.type === "email" && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</h3>
                  <p className="text-sm font-medium text-foreground mb-1">{selected.title}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.content ?? "—"}</p>
                </div>
              )}
              {(selected.type === "note" || selected.type === "text") && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message</h3>
                  <p className="text-sm font-medium text-foreground mb-1">{selected.title}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selected.content ?? selected.description ?? "—"}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Search className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-sm font-medium">Select an interaction to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
