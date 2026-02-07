import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getDeals } from "@/actions/deal-actions";
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client";

export const dynamic = 'force-dynamic';

export default async function TradiePage() {
  let workspace, deals;
  try {
    workspace = await getOrCreateWorkspace("demo-user");
    deals = await getDeals(workspace.id);
  } catch {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <p>Database not initialized.</p>
      </div>
    );
  }

  // Find the "Next Job"
  // Priority: 
  // 1. Deals in 'CONTRACT' stage (mapped from 'TRAVELING'/'ARRIVED')
  // 2. Deals in 'NEW' or 'CONTACTED' (Scheduled)
  // 3. Sort by date (oldest first? or newest?)
  
  const activeJob = deals.find(d => d.stage === 'contract') 
    || deals.find(d => d.stage === 'new' || d.stage === 'contacted');

  return (
    <TradieDashboardClient 
      initialJob={activeJob} 
      userName={workspace.name.split(' ')[0] || "Mate"} 
    />
  );
}
