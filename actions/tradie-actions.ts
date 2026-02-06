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

// ─── PDF / Printable Quote ──────────────────────────────────────────

export interface QuotePDFData {
  invoiceNumber: string;
  status: string;
  issuedAt: string | null;
  dealTitle: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  lineItems: { desc: string; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

/**
 * Generate structured data for a printable quote/invoice PDF.
 * Returns all data needed to render a quote — frontend can use
 * this with window.print(), @react-pdf/renderer, or any PDF lib.
 */
export async function generateQuotePDF(invoiceId: string): Promise<{
  success: boolean;
  data?: QuotePDFData;
  html?: string;
  error?: string;
}> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      deal: {
        include: { contact: true },
      },
    },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  const lineItems = (invoice.lineItems as { desc: string; price: number }[]) ?? [];

  const data: QuotePDFData = {
    invoiceNumber: invoice.number,
    status: invoice.status,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dealTitle: invoice.deal.title,
    contactName: invoice.deal.contact.name,
    contactEmail: invoice.deal.contact.email,
    contactPhone: invoice.deal.contact.phone,
    contactAddress: invoice.deal.contact.address,
    lineItems,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    createdAt: invoice.createdAt.toISOString(),
  };

  // Generate printable HTML as fallback
  const itemRows = lineItems
    .map(
      (item, i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${i + 1}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${item.desc}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">$${item.price.toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${invoice.number}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
.header{display:flex;justify-content:space-between;margin-bottom:40px}
.badge{padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600}
.draft{background:#fef3c7;color:#92400e}.issued{background:#dbeafe;color:#1e40af}.paid{background:#dcfce7;color:#166534}
table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;padding:8px;border-bottom:2px solid #1e293b;font-weight:600}
.totals{margin-top:20px;text-align:right}.totals div{margin:4px 0}.total{font-size:20px;font-weight:700}
@media print{body{padding:20px}}</style></head>
<body>
<div class="header"><div><h1 style="margin:0">QUOTE / TAX INVOICE</h1><p style="color:#64748b">${invoice.number}</p></div>
<div style="text-align:right"><span class="badge ${invoice.status.toLowerCase()}">${invoice.status}</span>
<p style="color:#64748b;margin:8px 0 0">${new Date(invoice.createdAt).toLocaleDateString("en-AU")}</p></div></div>
<div style="margin-bottom:30px"><h3 style="margin:0 0 4px">Bill To:</h3>
<p style="margin:0">${invoice.deal.contact.name}</p>
${invoice.deal.contact.email ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.email}</p>` : ""}
${invoice.deal.contact.phone ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.phone}</p>` : ""}
${invoice.deal.contact.address ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.address}</p>` : ""}</div>
<h3>Re: ${invoice.deal.title}</h3>
<table><thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${itemRows}</tbody></table>
<div class="totals"><div>Subtotal: $${invoice.subtotal.toFixed(2)}</div>
<div>GST (10%): $${invoice.tax.toFixed(2)}</div>
<div class="total">Total: $${invoice.total.toFixed(2)}</div></div>
</body></html>`;

  return { success: true, data, html };
}
