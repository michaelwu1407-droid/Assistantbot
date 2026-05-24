import { requireInternalAdminAccess } from "@/lib/internal-admin";
import { db } from "@/lib/db";
import { SupportTicketAdminTable } from "@/components/admin/support-ticket-table";

export const dynamic = "force-dynamic";

export default async function SupportAdminPage() {
  await requireInternalAdminAccess();

  const raw = await db.supportTicket.findMany({
    include: {
      workspace: { select: { id: true, name: true } },
      user: { select: { email: true, name: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, content: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const tickets = raw.map((t) => ({
    id: t.id,
    ref: t.ref,
    subject: t.subject,
    message: t.message,
    priority: t.priority,
    status: t.status,
    source: t.source,
    slaDeadline: t.slaDeadline.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    workspace: t.workspace,
    user: t.user,
    notes: t.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  }));

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Support tickets
        </h1>
        <p className="app-body-secondary">
          {tickets.length} total · {openCount} open
        </p>
      </div>
      <SupportTicketAdminTable tickets={tickets} />
    </div>
  );
}
