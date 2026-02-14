"use server"

import { db } from "@/lib/db"

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
 * Uses database 'contains' queries (case-insensitive) for scalability.
 */
export async function globalSearch(workspaceId: string, query: string): Promise<SearchResultItem[]> {
  if (!query || query.length < 2) return []

  // Parallel fetch with DB filtering
  const [contacts, deals, tasks] = await Promise.all([
    db.contact.findMany({
      where: {
        workspaceId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, email: true, company: true },
      take: 5
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        title: { contains: query, mode: 'insensitive' }
      },
      select: { id: true, title: true, value: true, stage: true, contact: { select: { company: true } } },
      take: 5
    }),
    db.task.findMany({
      where: {
        OR: [{ deal: { workspaceId } }, { contact: { workspaceId } }],
        title: { contains: query, mode: 'insensitive' },
        completed: false
      },
      select: { id: true, title: true },
      take: 5
    })
  ])

  const results: SearchResultItem[] = []

  // 1. Map Contacts
  contacts.forEach((c: any) => {
    results.push({
      id: c.id,
      type: "contact",
      title: c.name,
      subtitle: c.company || c.email || "Contact",
      url: `/contacts/${c.id}`,
      score: 1 // DB match implies relevance
    })
  })

  // 2. Map Deals
  deals.forEach((d: any) => {
    const dealWithContact = d as typeof d & {
      contact: { company: string | null };
    };
    
    results.push({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: `${d.stage} • $${(d.value ? d.value.toNumber() : 0).toLocaleString()}`,
      url: `/dashboard/deals/${d.id}`,
      score: 1
    })
  })

  // 3. Map Tasks
  tasks.forEach((t: any) => {
    results.push({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: t.dueAt ? `Due ${t.dueAt.toLocaleDateString()}` : "No due date",
      url: `/dashboard/tasks/${t.id}`,
      score: 1
    })
  })

  return results
}
