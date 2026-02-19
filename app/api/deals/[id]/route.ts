import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const deal = await db.deal.findUnique({
      where: { id },
      include: { contact: true, jobPhotos: { orderBy: { createdAt: "desc" } } },
    })

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const contactDeals = await db.deal.findMany({
      where: { contactId: deal.contactId, id: { not: id } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { contact: true },
    })

    return NextResponse.json({ deal, contactDeals })
  } catch (error) {
    console.error("Error fetching deal:", error)
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
  }
}
