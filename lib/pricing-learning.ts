import { db } from "@/lib/db";

type LearningTrigger = "draft_confirmed" | "completed";

type LearningResult = {
  created: boolean;
  reason?: string;
  taskId?: string;
};

function toAmount(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function suggestRange(observed: number): { min: number; max: number } {
  const min = Math.max(0, Math.round((observed * 0.9) / 5) * 5);
  const max = Math.max(min, Math.round((observed * 1.1) / 5) * 5);
  return { min, max: max === min ? min + 5 : max };
}

/**
 * Check whether observed price falls within an existing glossary/knowledge price range.
 * Returns true if the price is already covered — no suggestion needed.
 */
async function priceWithinGlossary(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  workspaceId: string,
  dealTitle: string,
  observed: number
): Promise<boolean> {
  // Check BusinessKnowledge PRICING rules for a matching service
  const pricingRules = await tx.businessKnowledge.findMany({
    where: { workspaceId, category: "PRICING" },
    select: { ruleContent: true, metadata: true },
  });

  const normTitle = dealTitle.toLowerCase();

  for (const rule of pricingRules) {
    // Only consider rules whose service name appears in the deal title
    if (!normTitle.includes(rule.ruleContent.toLowerCase())) continue;

    const meta = (rule.metadata as Record<string, unknown> | null) ?? {};
    const priceRange = (meta.priceRange as string) ?? "";

    // Parse "$100-$200" or "$150" style ranges
    const amounts = priceRange.match(/\d+(?:[.,]\d+)?/g)?.map(Number) ?? [];
    if (amounts.length === 0) continue;

    const lo = Math.min(...amounts);
    const hi = Math.max(...amounts);
    // 15% tolerance — don't nag if the observed price is close
    if (observed >= lo * 0.85 && observed <= hi * 1.15) return true;
  }

  return false;
}

/**
 * Creates a pricing-learning follow-up task + activity once per deal.
 * Idempotency is enforced by deal.metadata.pricingSuggestionCreatedAt.
 * Skips if the observed price already falls within the glossary range.
 */
export async function maybeCreatePricingSuggestionFromConfirmedJob(
  dealId: string,
  opts: { trigger: LearningTrigger; source: string }
): Promise<LearningResult> {
  return db.$transaction(async (tx) => {
    const deal = await tx.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        stage: true,
        isDraft: true,
        value: true,
        invoicedAmount: true,
        metadata: true,
        contactId: true,
        workspaceId: true,
        workspace: { select: { autoUpdateGlossary: true } },
      },
    });

    if (!deal) return { created: false, reason: "deal_not_found" };
    if (!deal.workspace.autoUpdateGlossary) return { created: false, reason: "learning_disabled" };
    if (deal.isDraft) return { created: false, reason: "still_draft" };
    if (opts.trigger === "completed" && deal.stage !== "WON") return { created: false, reason: "not_completed" };
    if (deal.title.toLowerCase().startsWith("manual revenue entry")) return { created: false, reason: "manual_revenue" };

    const metadata = (deal.metadata as Record<string, unknown> | null) ?? {};
    if (metadata.pricingSuggestionCreatedAt) return { created: false, reason: "already_created" };

    const observed = toAmount(deal.invoicedAmount ?? deal.value);
    if (observed <= 0) return { created: false, reason: "no_amount" };

    // Skip if the observed price already fits within an existing glossary range
    if (await priceWithinGlossary(tx, deal.workspaceId, deal.title, observed)) {
      return { created: false, reason: "within_glossary_range" };
    }

    const { min, max } = suggestRange(observed);
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);

    const task = await tx.task.create({
      data: {
        title: `Review pricing for "${deal.title}"`,
        description:
          `Observed job value: ${formatCurrency(observed)}. ` +
          `Suggested price band: ${formatCurrency(min)}-${formatCurrency(max)}. ` +
          `Review and add/update this service in Settings > My Business > Pricing for Agent.`,
        dueAt,
        dealId: deal.id,
        contactId: deal.contactId ?? undefined,
      },
    });

    await tx.activity.create({
      data: {
        type: "NOTE",
        title: "Pricing suggestion created",
        content:
          `Auto-created pricing review task from ${opts.trigger === "completed" ? "completed" : "confirmed"} job. ` +
          `Observed ${formatCurrency(observed)}, suggested ${formatCurrency(min)}-${formatCurrency(max)}.`,
        description: `Source: ${opts.source}`,
        dealId: deal.id,
        contactId: deal.contactId ?? undefined,
      },
    });

    await tx.deal.update({
      where: { id: deal.id },
      data: {
        metadata: JSON.parse(
          JSON.stringify({
            ...metadata,
            pricingSuggestionCreatedAt: new Date().toISOString(),
            pricingSuggestionTaskId: task.id,
            pricingSuggestionSource: opts.source,
            pricingSuggestion: {
              observed,
              suggestedMin: min,
              suggestedMax: max,
              trigger: opts.trigger,
            },
          })
        ),
      },
    });

    return { created: true, taskId: task.id };
  });
}
