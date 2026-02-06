"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

// ─── Validation ─────────────────────────────────────────────

const LineItemSchema = z.object({
  desc: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be non-negative"),
});

const GenerateQuoteSchema = z.object({
  dealId: z.string().cuid("Invalid deal ID"),
  items: z.array(LineItemSchema).min(1, "At least one line item is required"),
});

// ─── Types ──────────────────────────────────────────────────

export type LineItem = z.infer<typeof LineItemSchema>;

export interface QuoteResult {
  success: boolean;
  total?: number;
  dealId?: string;
  error?: string;
}

// ─── Server Action ──────────────────────────────────────────

export async function generateQuote(
  dealId: string,
  items: LineItem[]
): Promise<QuoteResult> {
  const parsed = GenerateQuoteSchema.safeParse({ dealId, items });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const deal = await prisma.deal.findUnique({
    where: { id: parsed.data.dealId },
  });

  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  const total = parsed.data.items.reduce((sum, item) => sum + item.price, 0);

  const existingMetadata =
    (deal.metadata as Record<string, unknown>) ?? {};

  await prisma.deal.update({
    where: { id: parsed.data.dealId },
    data: {
      value: total,
      stage: "INVOICED",
      metadata: {
        ...existingMetadata,
        line_items: parsed.data.items,
        quoted_at: new Date().toISOString(),
      },
    },
  });

  return { success: true, total, dealId: parsed.data.dealId };
}
