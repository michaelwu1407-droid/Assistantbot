"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Send, MessageSquare, Bot } from "lucide-react"
import { ActivityView } from "@/actions/activity-actions"
import { sendSMS } from "@/actions/messaging-actions"
import { formatTime, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type MessageMode = "direct" | "tracey"

interface InboxThreadMobileProps {
  contactId: string
  contactName: string
  contactPhone: string | null
  activities: ActivityView[]
  workspaceId: string
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function InboxThreadMobile({
  contactId,
  contactName,
  contactPhone,
  activities,
  workspaceId,
}: InboxThreadMobileProps) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [mode, setMode] = useState<MessageMode>("direct")
  const [sending, setSending] = useState(false)
  const [optimistic, setOptimistic] = useState<ActivityView[]>([])

  const all = [...activities, ...optimistic].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const handleSend = async () => {
    const body = text.trim()
    if (!body) return
    setSending(true)
    setText("")

    if (mode === "direct") {
      if (!contactPhone) {
        toast.error("No phone number on file for this contact")
        setSending(false)
        return
      }
      const temp: ActivityView = {
        id: `temp-${Date.now()}`,
        type: "EMAIL",
        title: "SMS",
        description: body,
        body,
        time: "just now",
        createdAt: new Date(),
        contactId,
        contactName,
      }
      setOptimistic((prev) => [...prev, temp])
      const result = await sendSMS(contactId, body)
      if (!result.success) toast.error(result.error || "Couldn't send that message — please try again.")
    } else {
      const temp: ActivityView = {
        id: `temp-${Date.now()}`,
        type: "NOTE",
        title: "Tracey",
        description: body,
        body,
        time: "just now",
        createdAt: new Date(),
        contactId,
        contactName,
      }
      setOptimistic((prev) => [...prev, temp])
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId,
          messages: [{ role: "user", content: `Contact: ${contactName} (${contactPhone || "no phone"}) — ${body}` }],
        }),
      })
    }
    setSending(false)
  }

  return (
    <div className="flex h-dvh flex-col bg-background pt-safe">
      <header className="shrink-0 bg-emerald-900 pb-3 pt-2 text-white">
        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{contactName}</p>
            {contactPhone && <p className="text-[12px] text-emerald-200/80">{contactPhone}</p>}
          </div>
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {all.map((a, i) => {
          const prev = all[i - 1]
          const showDate = !prev || !isSameDay(new Date(prev.createdAt), new Date(a.createdAt))
          const outbound = a.type === "EMAIL" || a.type === "NOTE"
          return (
            <li key={a.id}>
              {showDate && (
                <p className="text-center text-[11px] text-muted-foreground py-1">
                  {formatShortDate(a.createdAt)}
                </p>
              )}
              <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px]",
                  outbound
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}>
                  <p className="break-words">{a.description || a.title}</p>
                  <p className={cn("mt-1 text-[11px] tabular-nums", outbound ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {formatTime(a.createdAt)}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="shrink-0 border-t border-border/60 bg-card pb-safe px-3 pt-2">
        <div className="flex items-center gap-1 mb-2">
          {(["direct", "tracey"] as MessageMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                mode === m ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              {m === "direct" ? <MessageSquare className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              {m === "direct" ? "Direct" : "Tell Tracey"}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            placeholder={mode === "direct" ? "Send a message…" : "Ask Tracey to do something…"}
            className="flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-[15px] focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
