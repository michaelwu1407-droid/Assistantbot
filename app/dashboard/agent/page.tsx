import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getDeals } from "@/actions/deal-actions";
import { findMatches, getFreshLeads, MatchedContact } from "@/actions/agent-actions";
import { AgentDashboardClient } from "@/components/agent/agent-dashboard-client";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  let workspace, listings, leads;
  const matches: Record<string, MatchedContact[]> = {};
  let userId: string;

  try {
    userId = await getAuthUserId();
    workspace = await getOrCreateWorkspace(userId);
    listings = await getDeals(workspace.id);
    leads = await getFreshLeads(workspace.id);

    // Pre-fetch matches for active listings
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
      workspaceId={workspace.id}
      listings={listings}
      leads={leads}
      matches={matches}
      totalCommission={totalCommission}
      userName={workspace.name.split(' ')[0] || "Agent"}
      userId={userId}
    />
  );
}
