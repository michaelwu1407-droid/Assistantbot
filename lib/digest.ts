import { db } from "@/lib/db";
import { getDealHealth } from "@/lib/pipeline";

/**
 * "Morning Coffee" Digest
 *
 * Generates a daily summary: "Here are the 3 people you need to call
 * today to make money." Focuses on revenue-generating activities
 * vs admin work.
 */

export interface DigestItem {
  type: "rotting_deal" | "stale_deal" | "overdue_task" | "follow_up";
  priority: number; // 1 = highest
  title: string;
  description: string;
  dealId?: string;
  contactId?: string;
  value?: number;
}

export interface MorningDigest {
  greeting: string;
  date: string;
  totalPipelineValue: number;
  items: DigestItem[];
  topActions: string[];
}

export async function generateMorningDigest(
  workspaceId: string
): Promise<MorningDigest> {
  const now = new Date();
  const items: DigestItem[] = [];

  // 1. Find rotting deals (highest priority — money is walking away)
  // Filter out completed/lost stages to focus on active pipeline
  const activeDeals = await db.deal.findMany({
    where: {
      workspaceId,
      stage: { notIn: ["WON", "LOST", "ARCHIVED"] },
    },
    include: {
      contacts: { take: 1 },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  } as any);

  let totalPipelineValue = 0;

  for (const dealRaw of activeDeals) {
    const deal = dealRaw as any;
    totalPipelineValue += Number(deal.value ?? 0);
    const lastActivity = deal.activities?.[0]?.createdAt ?? deal.createdAt;
    const health = getDealHealth(lastActivity);
    const contactName = deal.contacts?.[0]?.name ?? 'Unknown';
    const contactId = deal.contacts?.[0]?.id;

    if (health.status === "ROTTING") {
      items.push({
        type: "rotting_deal",
        priority: 1,
        title: `${deal.title} is rotting (${health.daysSinceActivity}d)`,
        description: `$${deal.value?.toLocaleString() ?? 0} deal with ${contactName} — no activity in ${health.daysSinceActivity} days.`,
        dealId: deal.id,
        contactId: contactId,
        value: Number(deal.value),
      });
    } else if (health.status === "STALE") {
      items.push({
        type: "stale_deal",
        priority: 2,
        title: `${deal.title} is going stale (${health.daysSinceActivity}d)`,
        description: `$${deal.value?.toLocaleString() ?? 0} deal with ${contactName} needs attention.`,
        dealId: deal.id,
        contactId: contactId,
        value: Number(deal.value),
      });
    }
  }

  // 2. Find overdue tasks
  const overdueTasks = await db.task.findMany({
    where: {
      completed: false,
      dueAt: { lt: now },
      deal: { workspaceId },
    },
    include: { deal: true, contact: true },
    orderBy: { dueAt: "asc" },
    take: 5,
  });

  for (const task of overdueTasks) {
    items.push({
      type: "overdue_task",
      priority: 1,
      title: `Overdue: ${task.title}`,
      description: task.deal
        ? `Related to ${task.deal.title}`
        : task.contact
          ? `Follow up with ${task.contact.name}`
          : "Task overdue",
      dealId: task.dealId ?? undefined,
      contactId: task.contactId ?? undefined,
    });
  }

  // 3. Find tasks due today
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTasks = await db.task.findMany({
    where: {
      completed: false,
      dueAt: { gte: startOfDay, lte: endOfDay },
      deal: { workspaceId },
    },
    include: { deal: true, contact: true },
  });

  for (const task of todayTasks) {
    items.push({
      type: "follow_up",
      priority: 2,
      title: task.title,
      description: task.contact
        ? `Follow up with ${task.contact.name}`
        : "Due today",
      dealId: task.dealId ?? undefined,
      contactId: task.contactId ?? undefined,
    });
  }

  // Sort by priority then value
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.value ?? 0) - (a.value ?? 0);
  });

  // Generate top 3 action items
  const topActions = items
    .slice(0, 3)
    .map((item) => item.title);

  const greeting =
    now.getHours() < 12
      ? "Morning"
      : now.getHours() < 17
        ? "Afternoon"
        : "Evening";

  return {
    greeting,
    date: now.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    totalPipelineValue,
    items,
    topActions,
  };
}
