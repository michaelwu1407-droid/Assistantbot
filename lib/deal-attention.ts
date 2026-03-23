import { getOverdueStyling } from "@/lib/deal-utils";

type HealthStatus = "ROTTING" | "STALE" | "HEALTHY" | string;

export interface AttentionSignal {
  key: "overdue" | "stale" | "rotting" | "rejected" | "parked";
  label: string;
}

export interface AttentionDealInput {
  id: string;
  title: string;
  stage: string;
  health?: { status?: HealthStatus } | null;
  scheduledAt?: Date | null;
  actualOutcome?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function getAttentionSignalsForDeal(deal: AttentionDealInput): AttentionSignal[] {
  const signals: AttentionSignal[] = [];
  const meta = (deal.metadata ?? {}) as Record<string, unknown>;

  const overdue = getOverdueStyling({
    stage: deal.stage,
    scheduledAt: deal.scheduledAt ?? null,
    actualOutcome: deal.actualOutcome ?? null,
  }).badgeText.length > 0;

  if (overdue) signals.push({ key: "overdue", label: "Overdue" });
  if (deal.health?.status === "STALE") signals.push({ key: "stale", label: "Stale" });
  if (deal.health?.status === "ROTTING") signals.push({ key: "rotting", label: "Rotting" });

  const isRejected = Boolean(meta.completionRejectedAt || meta.completionRejectionReason);
  if (isRejected) signals.push({ key: "rejected", label: "Rejected" });

  const isParked = Boolean(meta.attentionRequiredTag || meta.parkedWithoutDate);
  if (isParked) signals.push({ key: "parked", label: "Parked" });

  return signals;
}

export function countAttentionRequiredDeals(deals: AttentionDealInput[]): number {
  return deals.reduce((count, deal) => {
    return getAttentionSignalsForDeal(deal).length > 0 ? count + 1 : count;
  }, 0);
}
