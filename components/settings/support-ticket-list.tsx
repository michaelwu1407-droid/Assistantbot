"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

type Ticket = {
  id: string
  ref: string
  subject: string
  priority: string
  status: string
  slaDeadline: string
  resolvedAt: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

function slaLabel(ticket: Ticket): string {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return "Resolved"
  const deadline = new Date(ticket.slaDeadline)
  const hoursLeft = Math.round((deadline.getTime() - Date.now()) / 3_600_000)
  if (hoursLeft < 0) return "Overdue"
  if (hoursLeft < 1) return "< 1 hr"
  return `${hoursLeft}h remaining`
}

export function SupportTicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/support/tickets")
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function closeTicket(id: string) {
    setClosing(id)
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      })
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "CLOSED" } : t)),
        )
      }
    } finally {
      setClosing(null)
    }
  }

  const open = tickets.filter((t) => t.status !== "CLOSED")
  if (loading || open.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="app-field-label">Your open tickets</p>
      {open.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="app-body-primary font-medium truncate">{ticket.subject}</span>
              <Badge variant="outline" className="text-xs shrink-0">{ticket.ref}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
              <span>·</span>
              <span>{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</span>
              <span>·</span>
              <span>{slaLabel(ticket)}</span>
            </div>
          </div>
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-xs h-7 px-2"
              disabled={closing === ticket.id}
              onClick={() => closeTicket(ticket.id)}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Close
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
