"use client"

import { useState } from "react"
import { Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendRunningLateMessage } from "@/actions/running-late-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRESETS = [10, 20, 30, 60]

interface RunningLateInlineProps {
  dealId: string
}

export function RunningLateInline({ dealId }: RunningLateInlineProps) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const handle = async (minutes: number) => {
    setSending(true)
    setOpen(false)
    const result = await sendRunningLateMessage(dealId, minutes)
    if (result.success) toast.success("Running-late message sent")
    else toast.error(result.error ?? "Couldn't send that message — please try again.")
    setSending(false)
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setOpen((v) => !v)}
        disabled={sending}
      >
        <Timer className="h-3.5 w-3.5" />
        Running late
      </Button>
      {open && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-900">How late? Tracey will text the customer.</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <Button key={m} size="sm" variant="outline" className={cn("h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100")} onClick={() => handle(m)} disabled={sending}>
                ~{m} min
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
