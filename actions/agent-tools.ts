"use server";

import { db } from "@/lib/db";

/**
 * Tool: get_schedule
 * Fetches scheduled jobs for a specific date range.
 * Use when the user asks "What am I doing next week?" or "Do I have space on Tuesday?"
 */
export async function runGetSchedule(
  workspaceId: string,
  params: { startDate: string; endDate: string }
): Promise<{
  jobs: {
    id: string;
    title: string;
    clientName: string;
    address: string | null;
    scheduledAt: string;
    jobStatus: string | null;
    value: number;
  }[];
  count: number;
}> {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  const jobs = await db.deal.findMany({
    where: {
      workspaceId,
      scheduledAt: {
        gte: start,
        lte: end,
      },
    },
    include: { contact: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return {
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      clientName: j.contact?.name || "Unknown",
      address: j.address,
      scheduledAt: j.scheduledAt?.toISOString() || "",
      jobStatus: j.jobStatus,
      value: j.value ? Number(j.value) : 0,
    })),
    count: jobs.length,
  };
}

/**
 * Tool: search_job_history
 * Searches for past jobs (completed/cancelled) based on keywords.
 * Use for queries like "When was the last time I visited Mrs. Jones?" or "Jobs at 10 Henderson St".
 */
export async function runSearchJobHistory(
  workspaceId: string,
  params: { query: string; limit?: number }
): Promise<{
  jobs: {
    id: string;
    title: string;
    clientName: string;
    address: string | null;
    scheduledAt: string | null;
    stage: string;
    jobStatus: string | null;
    value: number;
    createdAt: string;
  }[];
}> {
  const take = params.limit || 5;
  const q = params.query.trim();

  const jobs = await db.deal.findMany({
    where: {
      workspaceId,
      OR: [
        { address: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { contact: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { contact: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  return {
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      clientName: j.contact?.name || "Unknown",
      address: j.address,
      scheduledAt: j.scheduledAt?.toISOString() || null,
      stage: j.stage,
      jobStatus: j.jobStatus,
      value: j.value ? Number(j.value) : 0,
      createdAt: j.createdAt.toISOString(),
    })),
  };
}

/**
 * Tool: get_financial_report
 * Calculates revenue or job count for a date range.
 */
export async function runGetFinancialReport(
  workspaceId: string,
  params: { startDate: string; endDate: string }
): Promise<{
  totalRevenue: number;
  jobCount: number;
  averageJobValue: number;
  invoicedTotal: number;
  breakdown: { stage: string; count: number; value: number }[];
}> {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  const aggregate = await db.deal.aggregate({
    where: {
      workspaceId,
      createdAt: { gte: start, lte: end },
    },
    _sum: { value: true, invoicedAmount: true },
    _count: true,
    _avg: { value: true },
  });

  // Get breakdown by stage
  const byStage = await db.deal.groupBy({
    by: ["stage"],
    where: {
      workspaceId,
      createdAt: { gte: start, lte: end },
    },
    _count: true,
    _sum: { value: true },
  });

  return {
    totalRevenue: aggregate._sum.value ? Number(aggregate._sum.value) : 0,
    jobCount: aggregate._count,
    averageJobValue: aggregate._avg.value ? Number(aggregate._avg.value) : 0,
    invoicedTotal: aggregate._sum.invoicedAmount
      ? Number(aggregate._sum.invoicedAmount)
      : 0,
    breakdown: byStage.map((s) => ({
      stage: s.stage,
      count: s._count,
      value: s._sum.value ? Number(s._sum.value) : 0,
    })),
  };
}

/**
 * Tool: get_client_context
 * Fetches recent notes, messages, and jobs for a specific client.
 */
export async function runGetClientContext(
  workspaceId: string,
  params: { clientName: string }
): Promise<{
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
  } | null;
  recentNotes: { title: string; content: string | null; createdAt: string }[];
  recentMessages: {
    role: string;
    content: string;
    createdAt: string;
  }[];
  recentJobs: {
    title: string;
    stage: string;
    scheduledAt: string | null;
    value: number;
  }[];
}> {
  // Fuzzy match: find best matching contact
  const contacts = await db.contact.findMany({
    where: {
      workspaceId,
      name: { contains: params.clientName, mode: "insensitive" },
    },
    take: 1,
  });

  if (!contacts.length) {
    return {
      client: null,
      recentNotes: [],
      recentMessages: [],
      recentJobs: [],
    };
  }

  const contact = contacts[0];

  // Fetch last 5 notes (activities of type NOTE)
  const notes = await db.activity.findMany({
    where: { contactId: contact.id, type: "NOTE" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, content: true, createdAt: true },
  });

  // Fetch last 5 messages tied to this contact
  const messages = await db.chatMessage.findMany({
    where: {
      workspaceId,
      metadata: { path: ["contactId"], equals: contact.id },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { role: true, content: true, createdAt: true },
  });

  // Fetch last 3 jobs for this contact
  const jobs = await db.deal.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      title: true,
      stage: true,
      scheduledAt: true,
      value: true,
    },
  });

  return {
    client: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      address: contact.address,
    },
    recentNotes: notes.map((n) => ({
      title: n.title,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
    recentMessages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    recentJobs: jobs.map((j) => ({
      title: j.title,
      stage: j.stage,
      scheduledAt: j.scheduledAt?.toISOString() || null,
      value: j.value ? Number(j.value) : 0,
    })),
  };
}

/**
 * Tool: get_today_summary
 * Quick snapshot of today's scheduled jobs, overdue tasks, and unread messages.
 */
export async function runGetTodaySummary(
  workspaceId: string
): Promise<{
  todayJobs: { title: string; clientName: string; scheduledAt: string; address: string | null; phone: string | null; assignedTo: string | null; preparations: string[] }[];
  overdueTasks: { title: string; dueAt: string }[];
  recentMessages: number;
  preparationAlerts: string[];
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayJobs = await db.deal.findMany({
    where: {
      workspaceId,
      scheduledAt: { gte: todayStart, lte: todayEnd },
    },
    include: {
      contact: { select: { name: true, phone: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const overdueTasks = await db.task.findMany({
    where: {
      deal: { workspaceId },
      completed: false,
      dueAt: { lt: new Date() },
    },
    take: 5,
    orderBy: { dueAt: "asc" },
  });

  const recentMsgCount = await db.chatMessage.count({
    where: {
      workspaceId,
      createdAt: { gte: todayStart },
    },
  });

  // Preparation-focused checks for each job
  const preparationAlerts: string[] = [];
  const jobsWithPrep = todayJobs.map((j) => {
    const preparations: string[] = [];
    const meta = (j.metadata || {}) as Record<string, unknown>;

    // Missing address = can't navigate
    if (!j.address || j.address.trim().length < 5) {
      preparations.push("NO ADDRESS — confirm location before leaving");
      preparationAlerts.push(`${j.contact?.name || j.title}: missing address`);
    }

    // No contact phone = can't call ahead
    if (!j.contact?.phone) {
      preparations.push("NO PHONE — no way to contact client on the way");
      preparationAlerts.push(`${j.contact?.name || j.title}: no phone number`);
    }

    // Unassigned job
    if (!j.assignedToId) {
      preparations.push("UNASSIGNED — no team member allocated");
      preparationAlerts.push(`${j.contact?.name || j.title}: unassigned`);
    }

    // Draft/unconfirmed job (still in NEW or CONTACTED stage)
    if (j.stage === "NEW" || j.stage === "CONTACTED") {
      preparations.push("UNCONFIRMED — job not yet confirmed with customer");
      preparationAlerts.push(`${j.contact?.name || j.title}: unconfirmed`);
    }

    // No deposit taken (if metadata tracks it)
    if (meta.depositRequired && !meta.depositPaid) {
      preparations.push("DEPOSIT NOT PAID — collect before starting work");
    }

    // Job notes that mention materials
    const desc = (j.description || "").toLowerCase();
    if (desc.includes("material") || desc.includes("parts") || desc.includes("supplies")) {
      preparations.push("MATERIALS MENTIONED — verify you have required parts");
    }

    return {
      title: j.title,
      clientName: j.contact?.name || "Unknown",
      scheduledAt: j.scheduledAt?.toISOString() || "",
      address: j.address,
      phone: j.contact?.phone || null,
      assignedTo: j.assignedTo?.name || null,
      preparations,
    };
  });

  return {
    todayJobs: jobsWithPrep,
    overdueTasks: overdueTasks.map((t) => ({
      title: t.title,
      dueAt: t.dueAt?.toISOString() || "",
    })),
    recentMessages: recentMsgCount,
    preparationAlerts,
  };
}

/**
 * Tool: get_availability
 * Checks available time slots for a given date, given existing scheduled jobs.
 */
export async function runGetAvailability(
  workspaceId: string,
  params: { date: string; workingHoursStart?: string; workingHoursEnd?: string }
): Promise<{
  date: string;
  scheduledJobs: { title: string; startTime: string; clientName: string }[];
  availableSlots: string[];
}> {
  const targetDate = new Date(params.date);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const jobs = await db.deal.findMany({
    where: {
      workspaceId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      jobStatus: { not: "CANCELLED" },
    },
    include: { contact: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const whStart = params.workingHoursStart || "08:00";
  const whEnd = params.workingHoursEnd || "17:00";
  const [startH, startM] = whStart.split(":").map(Number);
  const [endH, endM] = whEnd.split(":").map(Number);

  // Generate 1-hour slots
  const bookedHours = new Set(
    jobs.map((j) => j.scheduledAt ? new Date(j.scheduledAt).getHours() : -1).filter((h) => h >= 0)
  );

  const availableSlots: string[] = [];
  for (let h = startH; h < endH; h++) {
    if (!bookedHours.has(h)) {
      const slot = `${String(h).padStart(2, "0")}:${String(startM).padStart(2, "0")} - ${String(h + 1).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      availableSlots.push(slot);
    }
  }

  return {
    date: params.date,
    scheduledJobs: jobs.map((j) => ({
      title: j.title,
      startTime: j.scheduledAt?.toISOString() || "",
      clientName: j.contact?.name || "Unknown",
    })),
    availableSlots,
  };
}
