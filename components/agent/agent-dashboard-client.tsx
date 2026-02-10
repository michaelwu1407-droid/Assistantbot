"use client"

import { DealView } from "@/actions/deal-actions"
import { AgentLead, MatchedContact } from "@/actions/agent-actions"
import { Header } from "@/components/dashboard/header"
import { SpeedToLead } from "@/components/agent/speed-to-lead"
import { CommissionCalculator } from "@/components/agent/commission-calculator"
import { MatchmakerFeed } from "@/components/agent/matchmaker-feed"
import { KanbanBoard } from "@/components/crm/kanban-board"
import { NewDealModal } from "@/components/modals/new-deal-modal"
import { PulseWidget } from "@/components/dashboard/pulse-widget"
import { VendorReportCard, VendorReportData } from "@/components/agent/vendor-report-card"
import { useState } from "react"

interface AgentDashboardClientProps {
  workspaceId: string
  listings: DealView[]
  leads: AgentLead[]
  matches: Record<string, MatchedContact[]>
  totalCommission: number
  userName: string
  userId: string
  financialStats?: {
    weeklyRevenue: number;
    outstandingDebt: number;
  }
  vendorReport?: VendorReportData | null
}

export function AgentDashboardClient({
  workspaceId,
  listings,
  leads,
  matches,
  userName,
  userId,
  financialStats,
  vendorReport
}: AgentDashboardClientProps) {
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false)

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-slate-50/50">
      <Header
        userName={userName}
        userId={userId}
        onNewDeal={() => setIsNewDealModalOpen(true)}
      />

      {/* Speed to Lead Widget and Pulse Widget Row */}
      <div className="shrink-0 flex gap-4 overflow-x-auto pb-2">
        <SpeedToLead leads={leads} />
        <PulseWidget
          mode="agent"
          weeklyRevenue={financialStats?.weeklyRevenue}
          outstandingDebt={financialStats?.outstandingDebt}
          className="h-full shrink-0"
        />
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

        {/* Left: Pipeline (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Active Listings
          </h3>
          <div className="flex-1 min-h-0 overflow-hidden">
            <KanbanBoard deals={listings} />
          </div>
        </div>

        {/* Right: Tools (1/3 width) */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2">

          {/* Commission Calculator */}
          <div>
            <CommissionCalculator />
          </div>

          {/* Vendor Report Card */}
          <div className="h-[320px]">
            <VendorReportCard data={vendorReport || undefined} />
          </div>

          {/* Matchmaker Feed */}
          <div className="flex-1 min-h-[300px]">
            <MatchmakerFeed workspaceId={workspaceId} />
          </div>

        </div>
      </div>

      <NewDealModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  )
}
