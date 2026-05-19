import { NewDealModalStandalone } from "@/components/modals/new-deal-modal-standalone";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { redirect } from "next/navigation";
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    redirect("/auth");
  }

  return (
    <>
    <MobileHeader pageTitle="New Booking" />
    <div className="h-full overflow-y-auto bg-muted/30 px-4 py-6 pb-24 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="hidden md:block space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">CRM Jobs</p>
          <h1 className="text-3xl font-bold text-foreground">New Booking</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create a real job record with customer details, schedule info, and address context in one place instead of bouncing back to the kanban board.
          </p>
        </div>
        <NewDealModalStandalone workspaceId={actor.workspaceId} />
      </div>
    </div>
    </>
  );
}
