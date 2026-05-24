"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";

type Note = { id: string; content: string; createdAt: string };
type Ticket = {
  id: string; ref: string; subject: string; message: string;
  priority: string; status: string; source: string;
  slaDeadline: string; resolvedAt: string | null; createdAt: string;
  workspace: { id: string; name: string };
  user: { email: string; name: string | null };
  notes: Note[];
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
type Status = (typeof STATUS_OPTIONS)[number];
const STATUS_LABELS: Record<Status, string> = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };
const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  urgent: "destructive", high: "default", medium: "secondary", low: "outline",
};

function slaLabel(t: Ticket) {
  if (t.status === "RESOLVED" || t.status === "CLOSED") return "—";
  const h = Math.round((new Date(t.slaDeadline).getTime() - Date.now()) / 3_600_000);
  return h < 0 ? "Overdue" : h < 1 ? "< 1 hr" : `${h}h`;
}

function slaClass(t: Ticket) {
  if (t.status === "RESOLVED" || t.status === "CLOSED") return "text-muted-foreground";
  const h = (new Date(t.slaDeadline).getTime() - Date.now()) / 3_600_000;
  return h < 0 ? "text-destructive font-medium" : h < 4 ? "text-amber-600 font-medium" : "text-muted-foreground";
}

export function SupportTicketAdminTable({ tickets: initial }: { tickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initial);
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const visible = filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);
  const counts = Object.fromEntries(STATUS_OPTIONS.map((s) => [s, tickets.filter((t) => t.status === s).length]));

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/support-tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${filter === s ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {s === "ALL" ? "All" : STATUS_LABELS[s]}
            <span className="text-xs opacity-60">{s === "ALL" ? tickets.length : counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Ref</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-20">SLA</TableHead>
              <TableHead className="w-40">Workspace</TableHead>
              <TableHead className="w-48">User</TableHead>
              <TableHead className="w-24">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No tickets</TableCell></TableRow>
            )}
            {visible.map((t) => (
              <>
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                >
                  <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{t.subject}</TableCell>
                  <TableCell><Badge variant={PRIORITY_VARIANT[t.priority] ?? "outline"}>{t.priority}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <select
                      value={t.status}
                      disabled={updating === t.id}
                      onChange={(e) => updateStatus(t.id, e.target.value as Status)}
                      className="text-sm rounded border border-border bg-background px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className={slaClass(t)}>{slaLabel(t)}</TableCell>
                  <TableCell className="text-sm truncate max-w-[160px]">{t.workspace.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[192px]">{t.user.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatShortDate(new Date(t.createdAt))}</TableCell>
                </TableRow>
                {expanded === t.id && (
                  <TableRow key={`${t.id}-detail`} className="bg-muted/20">
                    <TableCell colSpan={8} className="py-4 px-6">
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="app-field-label mb-1">Message</p>
                          <p className="whitespace-pre-wrap text-foreground">{t.message}</p>
                        </div>
                        {t.notes.length > 0 && (
                          <div>
                            <p className="app-field-label mb-1">Notes ({t.notes.length})</p>
                            <div className="space-y-2">
                              {t.notes.map((n) => (
                                <div key={n.id} className="rounded border border-border bg-card px-3 py-2">
                                  <p className="whitespace-pre-wrap">{n.content}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{formatShortDate(new Date(n.createdAt))}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
