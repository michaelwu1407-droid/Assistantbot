"use server"

import { db } from "@/lib/db"
import { fuzzySearch } from "@/lib/search"

export interface SearchResultItem {
  id: string
  type: "contact" | "deal" | "task"
  title: string
  subtitle?: string
  url: string
  score: number
}

/**
 * Global search across Contacts, Deals, and Tasks.
 * Uses fuzzy matching to find relevant items.
 */
export async function globalSearch(workspaceId: string, query: string): Promise<SearchResultItem[]> {
  if (!query || query.length < 2) return []

  // Fetch all potential matches (in a real app, we might use database full-text search)
  // For this scale, fetching lightweight lists and fuzzy searching in memory is fast enough
  const [contacts, deals, tasks] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId },
      select: { id: true, name: true, email: true, company: true }
    }),
    db.deal.findMany({
      where: { workspaceId },
      select: { id: true, title: true, value: true, stage: true, contact: { select: { company: true } } }
    }),
    db.task.findMany({
      where: {
        OR: [{ deal: { workspaceId } }, { contact: { workspaceId } }],
        completed: false
      },
      select: { id: true, title: true }
    })
  ])

  const results: SearchResultItem[] = []

  // 1. Search Contacts
  const contactMatches = fuzzySearch(
    contacts.map(c => ({
      id: c.id,
      searchableFields: [c.name ?? "", c.email ?? "", c.company ?? ""]
    })),
    query
  )

  contactMatches.forEach(({ item, score }) => {
    const c = contacts.find(x => x.id === item.id)!
    results.push({
      id: c.id,
      type: "contact",
      title: c.name,
      subtitle: c.company || c.email || "Contact",
      url: `/contacts/${c.id}`,
      score
    })
  })

  // 2. Search Deals
  const dealMatches = fuzzySearch(
    deals.map(d => ({
      id: d.id,
      searchableFields: [d.title, d.contact.company || ""]
    })),
    query
  )

  dealMatches.forEach(({ item, score }) => {
    const d = deals.find(x => x.id === item.id)!
    results.push({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: `${d.stage} • $${(d.value?.toNumber() ?? 0).toLocaleString()}`,
      url: `/dashboard?dealId=${d.id}`, // In future: /deals/${d.id}
      score
    })
  })

  // 3. Search Tasks
  const taskMatches = fuzzySearch(
    tasks.map(t => ({
      id: t.id,
      searchableFields: [t.title]
    })),
    query
  )

  taskMatches.forEach(({ item, score }) => {
    const t = tasks.find(x => x.id === item.id)!
    results.push({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: "Task",
      url: `/dashboard?taskId=${t.id}`,
      score
    })
  })

  // Sort by score descending and take top 10
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}
