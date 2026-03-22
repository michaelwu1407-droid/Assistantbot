import { DealDetailStageDemos } from "@/components/crm/deal-detail-stage-demos"

export const metadata = {
  title: "Deal detail modal — stage in header",
  description: "Stage dropdown next to Edit (production); older layout ideas below for reference.",
}

export default function DealDetailModalDesignPage() {
  return (
    <div className="min-h-screen bg-background">
      <DealDetailStageDemos />
    </div>
  )
}
