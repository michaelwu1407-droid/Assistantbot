import { getJobPortalStatus } from "@/actions/job-portal-actions"
import { JobStatusDisplay } from "./job-status-display"
import { notFound } from "next/navigation"

type PortalPageProps = {
  params: Promise<{ token: string }>
}

export default async function JobPortalPage({ params }: PortalPageProps) {
  const { token } = await params
  const status = await getJobPortalStatus(token)

  if (!status) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {status.businessName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Your appointment
          </h1>
        </div>

        <JobStatusDisplay token={token} initial={status} />

        <p className="text-center text-xs text-slate-400">Powered by Earlymark</p>
      </div>
    </main>
  )
}
