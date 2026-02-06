import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getInboxThreads } from "@/actions/messaging-actions";
import { InboxView } from "@/components/crm/inbox-view";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const workspace = await getOrCreateWorkspace("demo-user");
  const threads = await getInboxThreads(workspace.id);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 flex items-center px-4 shrink-0">
        <Link 
          href="/dashboard" 
          className="mr-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <InboxView initialThreads={threads} />
      </div>
    </div>
  );
}
