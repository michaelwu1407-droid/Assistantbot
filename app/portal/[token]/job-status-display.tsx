"use client"

import { useEffect, useState, useTransition } from "react"
import { getJobPortalStatus, type JobPortalStatus } from "@/actions/job-portal-actions"

const STATUS_STEPS = [
  { key: "SCHEDULED", label: "Booked" },
  { key: "TRAVELING", label: "On the way" },
  { key: "ON_SITE", label: "Arrived" },
  { key: "COMPLETED", label: "Complete" },
] as const

type StatusKey = (typeof STATUS_STEPS)[number]["key"]

function getStepIndex(status: string | null): number {
  if (!status) return 0
  const idx = STATUS_STEPS.findIndex((s) => s.key === status)
  return idx === -1 ? 0 : idx
}

export function JobStatusDisplay({
  token,
  initial,
}: {
  token: string
  initial: JobPortalStatus
}) {
  const [data, setData] = useState<JobPortalStatus>(initial)
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Poll every 5 minutes for status updates.
    const interval = setInterval(() => {
      startTransition(async () => {
        const updated = await getJobPortalStatus(token)
        if (updated) setData(updated)
      })
    }, 300_000)
    return () => clearInterval(interval)
  }, [token])

  const currentStep = getStepIndex(data.jobStatus)

  if (data.isCancelled) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">This appointment has been cancelled.</p>
        {data.businessPhone && (
          <p className="mt-2 text-sm text-red-600">
            Questions?{" "}
            <a href={`tel:${data.businessPhone}`} className="underline">
              Call us
            </a>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Job details */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Job</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{data.title}</p>
        {data.scheduledAt && (
          <p className="mt-1 text-sm text-slate-500">{data.scheduledAt}</p>
        )}
      </div>

      {/* Status timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Status
        </p>
        <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6">
          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx < currentStep
            const isCurrent = idx === currentStep
            return (
              <li key={step.key} className="relative">
                {/* Dot on the timeline */}
                <span
                  className={[
                    "absolute -left-[1.6rem] flex h-4 w-4 items-center justify-center rounded-full border-2",
                    isDone
                      ? "border-emerald-500 bg-emerald-500"
                      : isCurrent
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 bg-white",
                  ].join(" ")}
                >
                  {isDone && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path
                        d="M1 4l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={[
                    "text-sm",
                    isDone
                      ? "font-medium text-emerald-700"
                      : isCurrent
                        ? "font-semibold text-blue-700"
                        : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                  {isCurrent && step.key === "TRAVELING" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-blue-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      on the way
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Feedback prompt when complete */}
      {data.isComplete && data.feedbackUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-medium text-emerald-800">Job complete — how did we do?</p>
          <a
            href={data.feedbackUrl}
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Leave feedback
          </a>
        </div>
      )}

      {/* Contact number */}
      {data.businessPhone && !data.isComplete && (
        <p className="text-center text-sm text-slate-500">
          Questions?{" "}
          <a href={`tel:${data.businessPhone}`} className="font-medium text-slate-700 underline">
            Call {data.businessName}
          </a>
        </p>
      )}
    </div>
  )
}
