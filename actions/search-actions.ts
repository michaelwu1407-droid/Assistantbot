"use server"

import { db } from "@/lib/db"
import { fuzzySearch, type SearchableItem } from "@/lib/search"

export interface SearchResultItem {
  id: string
  type: "contact" | "deal" | "task" | "activity" | "call"
  title: string
  subtitle?: string
  url: string
  score: number
}

type SearchCandidate = SearchableItem & {
  result: Omit<SearchResultItem, "score">
}

/**
 * Global search across CRM records plus recent correspondence.
 * Uses scoped DB filtering for candidates, then fuzzy-sorts in memory.
 */
export async function globalSearch(workspaceId: string, query: string): Promise<SearchResultItem[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || trimmedQuery.length < 2) return []

  const [contacts, deals, tasks, activities, voiceCalls] = await Promise.all([
    db.contact.findMany({
      where: {
        workspaceId,
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" } },
          { email: { contains: trimmedQuery, mode: "insensitive" } },
          { company: { contains: trimmedQuery, mode: "insensitive" } },
          { phone: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, company: true, phone: true },
      take: 8,
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        OR: [
          { title: { contains: trimmedQuery, mode: "insensitive" } },
          { address: { contains: trimmedQuery, mode: "insensitive" } },
          { contact: { name: { contains: trimmedQuery, mode: "insensitive" } } },
          { contact: { company: { contains: trimmedQuery, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        title: true,
        value: true,
        stage: true,
        address: true,
        contact: { select: { name: true, company: true } },
      },
      take: 8,
    }),
    db.task.findMany({
      where: {
        AND: [
          { OR: [{ deal: { workspaceId } }, { contact: { workspaceId } }] },
          {
            OR: [
              { title: { contains: trimmedQuery, mode: "insensitive" } },
              { description: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          },
          { completed: false },
        ],
      },
      select: { id: true, title: true, description: true, dueAt: true, dealId: true, contactId: true },
      take: 8,
    }),
    db.activity.findMany({
      where: {
        AND: [
          { OR: [{ deal: { workspaceId } }, { contact: { workspaceId } }] },
          {
            OR: [
              { title: { contains: trimmedQuery, mode: "insensitive" } },
              { content: { contains: trimmedQuery, mode: "insensitive" } },
              { description: { contains: trimmedQuery, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        description: true,
        createdAt: true,
        dealId: true,
        contactId: true,
        contact: { select: { name: true } },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    db.voiceCall.findMany({
      where: {
        workspaceId,
        OR: [
          { callerName: { contains: trimmedQuery, mode: "insensitive" } },
          { businessName: { contains: trimmedQuery, mode: "insensitive" } },
          { callerPhone: { contains: trimmedQuery, mode: "insensitive" } },
          { transcriptText: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        callId: true,
        callType: true,
        callerName: true,
        businessName: true,
        callerPhone: true,
        transcriptText: true,
        contactId: true,
        startedAt: true,
      },
      take: 6,
      orderBy: { startedAt: "desc" },
    }),
  ])

  const candidates: SearchCandidate[] = []

  contacts.forEach((contact) => {
    candidates.push({
      id: `contact:${contact.id}`,
      searchableFields: [contact.name, contact.company || "", contact.email || "", contact.phone || ""].filter(Boolean),
      result: {
        id: contact.id,
        type: "contact",
        title: contact.name,
        subtitle: contact.company || contact.email || contact.phone || "Contact",
        url: `/dashboard/contacts/${contact.id}`,
      },
    })
  })

  deals.forEach((deal) => {
    const value =
      deal.value != null
        ? typeof deal.value === "object" && "toNumber" in deal.value
          ? deal.value.toNumber()
          : Number(deal.value)
        : 0

    candidates.push({
      id: `deal:${deal.id}`,
      searchableFields: [deal.title, deal.address || "", deal.contact?.name || "", deal.contact?.company || ""].filter(Boolean),
      result: {
        id: deal.id,
        type: "deal",
        title: deal.title,
        subtitle: `${deal.stage} • $${value.toLocaleString("en-AU")}`,
        url: `/dashboard/deals/${deal.id}`,
      },
    })
  })

  tasks.forEach((task) => {
    candidates.push({
      id: `task:${task.id}`,
      searchableFields: [task.title, task.description || ""].filter(Boolean),
      result: {
        id: task.id,
        type: "task",
        title: task.title,
        subtitle: task.dueAt ? `Due ${task.dueAt.toLocaleDateString("en-AU")}` : "No due date",
        url: task.dealId ? `/dashboard/deals/${task.dealId}` : task.contactId ? `/dashboard/contacts/${task.contactId}` : "/dashboard",
      },
    })
  })

  activities.forEach((activity) => {
    const summary = activity.description || activity.content || "Recent activity"
    candidates.push({
      id: `activity:${activity.id}`,
      searchableFields: [activity.title, activity.description || "", activity.content || "", activity.contact?.name || ""].filter(Boolean),
      result: {
        id: activity.id,
        type: "activity",
        title: activity.title,
        subtitle: summary,
        url: activity.dealId ? `/dashboard/deals/${activity.dealId}` : activity.contactId ? `/dashboard/contacts/${activity.contactId}` : "/dashboard",
      },
    })
  })

  voiceCalls.forEach((call) => {
    const caller = call.callerName || call.businessName || call.callerPhone || "Voice call"
    const transcriptSnippet = (call.transcriptText || "").replace(/\s+/g, " ").trim().slice(0, 120)
    candidates.push({
      id: `call:${call.id}`,
      searchableFields: [call.callerName || "", call.businessName || "", call.callerPhone || "", call.transcriptText || ""].filter(Boolean),
      result: {
        id: call.id,
        type: "call",
        title: `${caller} (${call.callType})`,
        subtitle: transcriptSnippet || `Started ${call.startedAt.toLocaleString("en-AU")}`,
        url: call.contactId ? `/dashboard/contacts/${call.contactId}` : "/dashboard",
      },
    })
  })

  return fuzzySearch(candidates, trimmedQuery, 0.35)
    .slice(0, 15)
    .map(({ item, score }) => ({
      ...item.result,
      score,
    }))
}
