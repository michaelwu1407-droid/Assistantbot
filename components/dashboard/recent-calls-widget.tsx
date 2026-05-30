"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Phone, PhoneIncoming, PhoneOutgoing, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface RecentCall {
  id: string
  callType: string
  callerName: string | null
  callerPhone: string | null
  summary: string | null
  startedAt: string
  endedAt: string | null
  dealId: string | null
  contactId: string | null
}

function CallIcon({ callType }: { callType: string }) {
  const isOutbound = callType === "outbound"
  const Icon = isOutbound ? PhoneOutgoing : PhoneIncoming
  return (
    <div className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
      isOutbound ? "bg-[#00D28B]/10 text-[#00D28B]" : "bg-[#4A7CE6]/10 text-[#4A7CE6]",
    )}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  )
}

export function RecentCallsWidget({ workspaceId }: { workspaceId: string }) {
  const [calls, setCalls] = useState<RecentCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/voice-calls/recent")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false))
  }, [workspaceId])

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden" style={{ borderColor: "#E6E2D7" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#E6E2D7" }}>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="app-panel-title">Recent calls</span>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="h-3 bg-muted/60 rounded w-1/2" />
                <div className="h-2.5 bg-muted/60 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="ott-empty-state py-8">
          <div className="ott-empty-state-icon"><Phone className="h-5 w-5" /></div>
          <p className="ott-empty-state-title">No calls yet</p>
          <p className="ott-empty-state-body">Tracey's calls will appear here once she starts handling leads.</p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "#E6E2D7" }}>
          {calls.map((call) => {
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                <CallIcon callType={call.callType} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="app-body-primary truncate font-medium">
                      {call.callerName || call.callerPhone || "Unknown caller"}
                    </p>
                    <span className="app-body-secondary shrink-0 text-xs">
                      {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
                    </span>
                  </div>
                  {call.summary ? (
                    <p className="app-body-secondary mt-0.5 line-clamp-2 text-xs">{call.summary}</p>
                  ) : (
                    <p className="app-body-secondary mt-0.5 text-xs italic">No summary recorded</p>
                  )}
                </div>
                {call.dealId && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-0.5" />}
              </div>
            )

            return (
              <li key={call.id}>
                {call.dealId ? (
                  <Link href={`/crm/deals/${call.dealId}`}>{inner}</Link>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
