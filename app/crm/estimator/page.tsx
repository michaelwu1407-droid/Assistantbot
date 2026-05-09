import { getDeals } from "@/actions/deal-actions";
import { EstimatorForm } from "@/components/tradie/estimator-form";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrmEstimatorPage() {
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
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">CRM Billing</p>
        <h1 className="text-3xl font-bold text-foreground">Estimator</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Build a GST-inclusive quote for an active job, then open the linked billing panel to issue the draft invoice when you are ready.
        </p>
      </div>

      {visibleDeals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">No active deals ready for an estimate</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create or schedule a job first, then it will appear here so you can build the quote directly against the live CRM record.
          </p>
        </div>
      ) : (
        <EstimatorForm deals={visibleDeals as never[]} workspaceId={actor.workspaceId} />
      )}
    </div>
  );
}
