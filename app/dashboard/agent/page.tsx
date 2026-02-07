import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getDeals } from "@/actions/deal-actions";
import { findMatches, MatchedContact } from "@/actions/agent-actions";
import { AgentDashboardClient } from "@/components/agent/agent-dashboard-client";

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  let workspace, listings;
  const matches: Record<string, MatchedContact[]> = {};

  try {
    workspace = await getOrCreateWorkspace("demo-user");
    listings = await getDeals(workspace.id);

    // Pre-fetch matches for active listings
    // In a real app, we might only do this for the top 3 or on demand
    const activeListings = listings.filter(l => l.stage === 'new' || l.stage === 'contacted');
    
    for (const listing of activeListings) {
      const result = await findMatches(listing.id);
      if (result.success && result.matches && result.matches.length > 0) {
        matches[listing.id] = result.matches;
      }
    }

  } catch {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400">
        <p>Database not initialized.</p>
      </div>
    );
  }

  // Calculate estimated commission (approx 2% of total value)
  const totalValue = listings.reduce((sum, l) => sum + Number(l.value), 0);
  const totalCommission = totalValue * 0.02;

  return (
    <AgentDashboardClient 
      listings={listings} 
      matches={matches}
      totalCommission={totalCommission}
    />
  );
}
