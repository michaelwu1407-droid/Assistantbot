import { NextResponse } from "next/server"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  let actor
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (actor.role === "TEAM_MEMBER") {
    return NextResponse.json({ error: "Only workspace owners can export data" }, { status: 403 })
  }

  const workspaceId = actor.workspaceId

  const [contacts, deals] = await Promise.all([
    db.contact.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.deal.findMany({
      where: { workspaceId, stage: { not: "DELETED" } },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        address: true,
        scheduledAt: true,
        createdAt: true,
        contact: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    workspaceId,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      company: c.company ?? "",
      address: c.address ?? "",
      createdAt: c.createdAt.toISOString(),
    })),
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value ?? 0,
      address: d.address ?? "",
      scheduledAt: d.scheduledAt?.toISOString() ?? "",
      contactName: d.contact?.name ?? "",
      contactEmail: d.contact?.email ?? "",
      contactPhone: d.contact?.phone ?? "",
      createdAt: d.createdAt.toISOString(),
    })),
  }

  const filename = `earlymark-export-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
