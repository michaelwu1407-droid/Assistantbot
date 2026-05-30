"use client"

import { DealView } from "@/actions/deal-actions"
import { formatCurrency, formatDate } from "@/lib/format"
import { CheckCircle2, FileText, MessageSquare, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface WrapUpClientProps {
  doneToday: DealView[]
  unpaidDeals: DealView[]
  staleQuotes: DealView[]
  timezone: string
}

function getValue(d: DealView) {
  return typeof d.invoicedAmount === "number" && d.invoicedAmount > 0
    ? d.invoicedAmount
    : d.value || 0
}

export function WrapUpClient({ doneToday, unpaidDeals, staleQuotes, timezone }: WrapUpClientProps) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", timeZone: timezone,
  })

  const collected = doneToday.reduce((s, d) => s + getValue(d), 0)
  const outstanding = unpaidDeals.reduce((s, d) => s + getValue(d), 0)

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-muted-foreground" />
          <p className="app-field-label">{today}</p>
        </div>
        <h1 className="app-page-title">Tonight&apos;s Wrap</h1>
        <p className="app-body-secondary">Here&apos;s how today shaped up.</p>
      </div>

      <div className="space-y-3">
        <StatRow
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label={`${doneToday.length} ${doneToday.length === 1 ? "job" : "jobs"} done today`}
          value={doneToday.length > 0 ? `${formatCurrency(collected)} collected` : "No jobs completed today"}
          highlight={doneToday.length > 0}
        />
        <StatRow
          icon={<FileText className="h-5 w-5 text-amber-500" />}
          label={`${unpaidDeals.length} ${unpaidDeals.length === 1 ? "invoice" : "invoices"} unpaid`}
          value={unpaidDeals.length > 0 ? `${formatCurrency(outstanding)} outstanding` : "Nothing outstanding"}
          highlight={false}
        />
        <StatRow
          icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
          label={`${staleQuotes.length} ${staleQuotes.length === 1 ? "quote" : "quotes"} needs chasing`}
          value={staleQuotes.length > 0 ? "No replies in 3+ days" : "All quotes are fresh"}
          highlight={false}
        />
      </div>

      {(unpaidDeals.length > 0 || staleQuotes.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {unpaidDeals.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/crm/dashboard?filter=ready_to_invoice">View unpaid invoices</Link>
            </Button>
          )}
          {staleQuotes.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/crm/chat">Chase stale quotes</Link>
            </Button>
          )}
        </div>
      )}

      {doneToday.length === 0 && unpaidDeals.length === 0 && staleQuotes.length === 0 && (
        <p className="app-body-secondary">Looks like a quiet day — enjoy the rest of the evening.</p>
      )}
    </div>
  )
}

function StatRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight: boolean
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={highlight ? "font-semibold text-foreground" : "app-body-primary"}>{label}</p>
        <p className="app-body-secondary">{value}</p>
      </div>
    </div>
  )
}
