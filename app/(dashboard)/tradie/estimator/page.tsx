import { getDeals } from "@/actions/deal-actions";
import { EstimatorForm } from "@/components/tradie/estimator-form";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TradieEstimatorPage() {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    redirect("/auth");
  }

  const deals = await getDeals(actor.workspaceId);

  const visibleDeals = deals
    .filter((deal) => deal.stage !== "deleted" && deal.stage !== "lost")
    .filter((deal) => actor.role !== "TEAM_MEMBER" || deal.assignedToId === actor.id)
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
          <EstimatorForm deals={visibleDeals as never[]} workspaceId={actor.workspaceId} />
        )}
      </div>
    </div>
  );
}
