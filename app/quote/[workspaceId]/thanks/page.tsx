import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ workspaceId: string }> };

export default async function HostedQuoteFormThanksPage({ params }: Props) {
  const { workspaceId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  if (!workspace) notFound();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-md shadow-sm p-8 text-center space-y-3">
        <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">
          ✓
        </div>
        <h1 className="app-page-title">Thanks — we&apos;ve got your details.</h1>
        <p className="app-body-secondary">
          {workspace.name} will be in touch shortly to discuss your job.
        </p>
      </div>
    </div>
  );
}
