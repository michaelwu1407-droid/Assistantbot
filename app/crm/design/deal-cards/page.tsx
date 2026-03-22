import { DealCardPendingBannerDemos } from "@/components/crm/deal-card-pending-banner-demos"

/** Internal preview only: open at /crm/design/deal-cards (not linked from the main nav). */
export const metadata = {
  title: "Deal card — design options",
  description:
    "Layout comparisons for designers. Production Kanban uses (3C) bottom overlay at 65% opacity only.",
}

export default function DealCardDesignPage() {
  return (
    <div className="min-h-screen bg-background">
      <DealCardPendingBannerDemos />
    </div>
  )
}
