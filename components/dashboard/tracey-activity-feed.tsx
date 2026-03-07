"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Activity, ArrowRight, Phone, Plus, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityItem {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

const ACTION_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  "deal.created": { icon: Plus, color: "text-status-new bg-status-new/10", label: "New job created" },
  "deal.stage_changed": { icon: ArrowRight, color: "text-status-scheduled bg-status-scheduled/10", label: "Stage changed" },
  "contact.created": { icon: UserPlus, color: "text-primary bg-primary-subtle", label: "Contact added" },
  "call.completed": { icon: Phone, color: "text-status-awaiting bg-status-awaiting/10", label: "Call completed" },
}

const DEFAULT_CONFIG = { icon: Activity, color: "text-neutral-500 bg-neutral-100", label: "Activity" }

export function TraceyActivityFeed({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/activity?workspaceId=${workspaceId}&limit=20`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [workspaceId])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-neutral-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-neutral-100 rounded w-3/4" />
              <div className="h-2.5 bg-neutral-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <Activity className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-neutral-100">
      {items.map((item) => {
        const config = ACTION_CONFIG[item.action] ?? DEFAULT_CONFIG
        const Icon = config.icon
        const meta = item.metadata ?? {}
        const title = (meta.title as string) || config.label
        const detail = (meta.detail as string) || ""

        return (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-900 font-medium truncate">{title}</p>
              {detail && <p className="text-xs text-neutral-500 truncate">{detail}</p>}
              <p className="text-xs text-neutral-400 mt-0.5">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
