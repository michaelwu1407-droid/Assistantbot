import { requireInternalAdminAccess } from "@/lib/internal-admin";
import { getAllServiceReadiness } from "@/lib/real-integration-readiness";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireInternalAdminAccess();

  const services = getAllServiceReadiness(process.env as Record<string, string | undefined>);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="app-page-title">Integration readiness</h1>
        <p className="app-body-secondary mt-1">
          Which third-party services are fully configured in the current environment.
          Missing required keys are highlighted — check{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.example</code> for where
          to get each one.
        </p>
      </div>

      <div className="space-y-3">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="rounded-md border bg-card p-4 shadow-sm"
            style={{ borderColor: "#E6E2D7" }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                {svc.ready ? (
                  <CheckCircle2 className="h-5 w-5 text-[#00D28B] shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <span className="font-semibold text-foreground capitalize">{svc.name}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                svc.ready
                  ? "bg-[#00D28B]/10 text-[#00D28B]"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {svc.ready ? "Ready" : `${svc.missingRequired.length} missing`}
              </span>
            </div>

            {svc.missingRequired.length > 0 && (
              <div className="space-y-1 mb-2">
                {svc.missingRequired.map((key) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <code>{key}</code>
                    <span className="text-muted-foreground">— required, not set</span>
                  </div>
                ))}
              </div>
            )}

            {svc.presentRequired.length > 0 && (
              <div className="space-y-1">
                {svc.presentRequired.map((key) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-[#00D28B]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <code>{key}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="app-body-secondary text-xs">
        See <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/PENDING_MANUAL_STEPS.md</code> for
        the Upstash + Vercel steps needed to complete QStash setup.
      </p>

      <p className="app-body-secondary text-xs">
        Tuning voice routing?{" "}
        <a href="/admin/voice-latency" className="underline">
          Voice latency by provider →
        </a>
      </p>
    </div>
  );
}
