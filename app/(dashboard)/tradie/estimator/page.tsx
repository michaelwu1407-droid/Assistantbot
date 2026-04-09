import { getDeals } from "@/actions/deal-actions";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { EstimatorForm } from "@/components/tradie/estimator-form";
import { getAuthUser } from "@/lib/auth";
import { getCurrentUserRole } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TradieEstimatorPage() {
  const authUser = await getAuthUser();
  if (!authUser) {
    redirect("/auth");
  }

  const workspace = await getOrCreateWorkspace(authUser.id);
  const [role, deals] = await Promise.all([
    getCurrentUserRole(),
    getDeals(workspace.id),
  ]);

  const visibleDeals = deals
    .filter((deal) => deal.stage !== "deleted" && deal.stage !== "lost")
    .filter((deal) => role !== "TEAM_MEMBER" || deal.assignedToId === authUser.id)
    .map((deal) => ({ id: deal.id, title: deal.title }));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tradie Tools</p>
          <h1 className="text-3xl font-bold text-slate-900">Estimator</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Build a quote against a real job, check the GST-inclusive total, then hand the draft invoice back to billing so it can be marked as issued and emailed to the customer.
          </p>
        </div>

        {visibleDeals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">No jobs ready to estimate</h2>
            <p className="mt-2 text-sm text-slate-600">
              Once you have an active assigned job or quote-ready deal, it will appear here so you can build the estimate without leaving the tradie flow.
            </p>
          </div>
        ) : (
          <EstimatorForm deals={visibleDeals as never[]} workspaceId={workspace.id} />
        )}
      </div>
    </div>
  );
}
