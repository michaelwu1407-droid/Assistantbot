"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, UserPlus, Phone, Mail } from "lucide-react"
import { ContactView } from "@/actions/contact-actions"
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header"
import { formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ContactsMobileProps {
  contacts: ContactView[]
}

type Filter = "all" | "lead" | "customer"

const LEAD_STAGES = new Set(["NEW", "CONTACTED", "NEGOTIATION", "PIPELINE"])
const CUSTOMER_STAGES = new Set(["SCHEDULED", "INVOICED", "WON"])

function classify(stage: string | null): Filter {
  if (!stage) return "lead"
  if (CUSTOMER_STAGES.has(stage)) return "customer"
  if (LEAD_STAGES.has(stage)) return "lead"
  return "lead"
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ContactsMobile({ contacts }: ContactsMobileProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filter !== "all" && classify(c.primaryDealStage) !== filter) return false
      if (!query) return true
      const q = query.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      )
    })
  }, [contacts, query, filter])

  return (
    <>
      <MobileHeader
        pageTitle="Contacts"
        rightSlot={
          <Link
            href="/crm/contacts/new"
            aria-label="Add contact"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <UserPlus className="h-4 w-4" />
          </Link>
        }
      />
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts"
            className="w-full rounded-md border border-border bg-card py-3 pl-10 pr-3 text-[15px] focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
        {(["all", "lead", "customer"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium capitalize whitespace-nowrap",
              filter === f
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {f === "all" ? "All" : f === "lead" ? "Leads" : "Customers"}
          </button>
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-border/40 border-y border-border/40">
        {filtered.length === 0 && (
          <li className="px-4 py-12">
            <div className="ott-empty-state">
              <p className="ott-empty-state-title">No contacts</p>
              <p className="ott-empty-state-body">Add a contact to get started.</p>
            </div>
          </li>
        )}
        {filtered.map((c) => (
          <li key={c.id}>
            <Link href={`/crm/contacts/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-foreground">
                {initials(c.name) || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-foreground">{c.name}</p>
                <p className="truncate text-[12px] text-muted-foreground flex items-center gap-1">
                  {c.phone ? (
                    <>
                      <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                    </>
                  ) : c.email ? (
                    <>
                      <Mail className="h-3 w-3 shrink-0" /> {c.email}
                    </>
                  ) : (
                    "No contact info"
                  )}
                </p>
              </div>
              {c.lastActivityDate && (
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {formatShortDate(c.lastActivityDate)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
