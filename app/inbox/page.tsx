import { redirect } from "next/navigation";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getActivities } from "@/actions/activity-actions";
import { getContacts } from "@/actions/contact-actions";
import { InboxView } from "@/components/crm/inbox-view";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const EXISTING_STAGES = ["SCHEDULED", "PIPELINE", "INVOICED", "WON"] as const;

export default async function InboxPage() {
  let workspace, interactions, contactSegment: Record<string, "lead" | "existing"> = {};
  let dbError = false;
  try {
    const userId = await getAuthUserId();
    workspace = await getOrCreateWorkspace(userId);
    const [activities, contacts] = await Promise.all([
      getActivities({ workspaceId: workspace.id, typeIn: ["EMAIL", "CALL", "NOTE"] }),
      getContacts(workspace.id),
    ]);
    interactions = activities;
    for (const c of contacts) {
      contactSegment[c.id] = EXISTING_STAGES.includes((c.primaryDealStageKey ?? "") as (typeof EXISTING_STAGES)[number])
        ? "existing"
        : "lead";
    }
  } catch {
    dbError = true;
  }

  if (!dbError && workspace && !workspace.onboardingComplete) {
    redirect("/setup");
  }

  if (dbError || !workspace || !interactions) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-500">Database not initialized. Please push the schema first.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="h-16 border-b border-slate-200 flex items-center px-4 shrink-0">
        <Link
          href="/dashboard"
          className="mr-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <InboxView initialInteractions={interactions} contactSegment={contactSegment} />
      </div>
    </div>
  );
}
