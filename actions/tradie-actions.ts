"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Validation ─────────────────────────────────────────────

const LineItemSchema = z.object({
  desc: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be non-negative"),
});

const GenerateQuoteSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  items: z.array(LineItemSchema).min(1, "At least one line item is required"),
});

// ─── Types ──────────────────────────────────────────────────

export type LineItem = z.infer<typeof LineItemSchema>;

export interface QuoteResult {
  success: boolean;
  total?: number;
  invoiceNumber?: string;
  dealId?: string;
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────

/**
 * Generate a quick quote for a Tradie deal.
 * Calculates total from line items, updates deal value + metadata,
 * sets stage to INVOICED, and creates an Invoice record.
 */
export async function generateQuote(
  dealId: string,
  items: LineItem[]
): Promise<QuoteResult> {
  const parsed = GenerateQuoteSchema.safeParse({ dealId, items });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const deal = await db.deal.findUnique({
    where: { id: parsed.data.dealId },
  });

  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1; // 10% GST (Australian)
  const total = subtotal + tax;

  const existingMetadata = (deal.metadata as Record<string, unknown>) ?? {};

  // Update the deal
  await db.deal.update({
    where: { id: parsed.data.dealId },
    data: {
      value: total,
      stage: "INVOICED",
      metadata: JSON.parse(JSON.stringify({
        ...existingMetadata,
        line_items: parsed.data.items,
        quoted_at: new Date().toISOString(),
        subtotal,
        tax,
      })),
    },
  });

  // Create an Invoice record
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  await db.invoice.create({
    data: {
      number: invoiceNumber,
      lineItems: JSON.parse(JSON.stringify(parsed.data.items)),
      subtotal,
      tax,
      total,
      status: "DRAFT",
      dealId: parsed.data.dealId,
    },
  });

  // Log the activity
  await db.activity.create({
    data: {
      type: "TASK",
      title: "Quote generated",
      content: `Generated quote ${invoiceNumber} for $${total.toLocaleString()} (${parsed.data.items.length} items)`,
      dealId: parsed.data.dealId,
      contactId: deal.contactId,
    },
  });

  return { success: true, total, invoiceNumber, dealId: parsed.data.dealId };
}

/**
 * Get invoices for a deal.
 */
export async function getDealInvoices(dealId: string) {
  return db.invoice.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mark an invoice as issued/sent.
 */
export async function issueInvoice(invoiceId: string) {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "ISSUED", issuedAt: new Date() },
  });
  return { success: true };
}

/**
 * Mark an invoice as paid.
 */
export async function markInvoicePaid(invoiceId: string) {
  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
    include: { deal: true },
  });

  // Move deal to WON when paid
  await db.deal.update({
    where: { id: invoice.dealId },
    data: { stage: "WON" },
  });

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice paid",
      content: `Invoice ${invoice.number} marked as paid ($${invoice.total.toLocaleString()})`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });

  return { success: true };
}
