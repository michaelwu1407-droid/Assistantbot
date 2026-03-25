
import { EstimatorForm } from "@/components/tradie/estimator-form";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EstimatorPage() {
    const userId = await getAuthUserId();

    if (!userId) {
        redirect("/auth");
    }

    let workspaceId: string | null = null;
    let errorMessage: string | null = null;

    try {
        const workspace = await getOrCreateWorkspace(userId);
        workspaceId = workspace.id;
    } catch (error) {
        console.error("Estimator page error:", error);
        errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    if (errorMessage || !workspaceId) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-50 p-4 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Estimator</h2>
                    <p className="text-slate-400">{errorMessage || "Unknown error"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-4 pb-24">
            <header className="flex items-center gap-4 mb-6 sticky top-0 bg-slate-950 z-10 py-2">
                <Link href="/crm/tradie">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Quick Estimator</h1>
            </header>

            <EstimatorForm workspaceId={workspaceId} />
        </div>
    );
}
