import { getUserFacingDealStageLabel } from "@/lib/deal-utils"

/** Field / portal statuses shown on tradie job detail (not only Prisma deal stages). */
const FIELD_JOB_STATUS_LABELS: Record<string, string> = {
  TRAVELING: "On the way",
  ON_SITE: "On site",
  COMPLETED: "Completed",
}

/** Human-readable label for the job header badge (deal stages + field statuses). */
export function formatJobHeaderStatus(status: string): string {
  const s = status.trim()
  if (FIELD_JOB_STATUS_LABELS[s]) return FIELD_JOB_STATUS_LABELS[s]
  return getUserFacingDealStageLabel(s)
}

/** Human-readable invoice status for the billing tab. */
export function formatInvoiceStatusLabel(status: string): string {
  const u = status.trim().toUpperCase()
  const map: Record<string, string> = {
    PAID: "Paid",
    ISSUED: "Issued",
    DRAFT: "Draft",
    VOID: "Void",
    UNPAID: "Unpaid",
  }
  return map[u] ?? status
}
