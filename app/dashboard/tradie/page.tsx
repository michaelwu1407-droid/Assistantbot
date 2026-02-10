import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getDeals } from "@/actions/deal-actions";
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client";
import { getAuthUserId } from "@/lib/auth";

import { getFinancialStats } from "@/actions/dashboard-actions";

export const dynamic = 'force-dynamic';

export default async function TradiePage() {
  let workspace, deals, financialStats, todaySchedule;
  try {
    const userId = await getAuthUserId();
    workspace = await getOrCreateWorkspace(userId);
    deals = await getDeals(workspace.id);
    financialStats = await getFinancialStats(workspace.id);
    // Fetch specifically today's jobs for the map
    const { getTodaySchedule } = await import("@/actions/tradie-actions");
    todaySchedule = await getTodaySchedule(workspace.id);

  } catch {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <p>Database not initialized.</p>
      </div>
    );
  }

  // Find the "Next Job" for the bottom sheet focus
  // Priority: 
  // 1. Deals in 'contract' stage (mapped from 'TRAVELING'/'ARRIVED')
  // 2. Deals in 'new' or 'contacted' (Scheduled)
  const activeJob = deals.find(d => d.stage === 'contract')
    || deals.find(d => d.stage === 'new' || d.stage === 'contacted')
    || deals[0]; // Fallback to first available if none active

  return (
    <TradieDashboardClient
      initialJob={activeJob}
      todayJobs={todaySchedule}
      userName={workspace.name.split(' ')[0] || "Mate"}
      financialStats={financialStats}
    />
  );
}
