"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface AgentLead {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  phone: string | null;
  email: string | null;
  avatar?: string;
  interestedLevel?: number;
}

/**
 * Fetch "Fresh" leads for the Speed-to-Lead widget.
 * Definition: Created within the last 24 hours (for demo visibility, usually it's < 30 mins)
 * and status is 'NEW'.
 */
export async function getFreshLeads(workspaceId: string): Promise<AgentLead[]> {
  // For demo purposes, we might not have data < 30 mins old.
  // So we'll fetch all NEW leads and sort by desc.
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      stage: "NEW"
    },
    include: {
      contact: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });

  return deals.map(d => ({
    id: d.id,
    name: d.contact.name,
    source: "Domain.com.au", // Mock source, or add to metadata
    createdAt: d.createdAt,
    phone: d.contact.phone,
    email: d.contact.email,
    interestedLevel: (d.metadata as any)?.interestedLevel || 3
  }));
}

/**
 * Fetch pipeline for Kanban board.
 */
export async function getAgentPipeline(workspaceId: string) {
  const deals = await db.deal.findMany({
    where: { workspaceId },
    include: { contact: true },
    orderBy: { updatedAt: "desc" }
  });

  // Group by stage? Or return flat list and let client group.
  // Flat list is better for dnd-kit.
  return deals.map(d => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value ? Number(d.value) : 0,
    contactName: d.contact.name,
    updatedAt: d.updatedAt
  }));
}
