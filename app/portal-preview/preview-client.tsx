"use client";

import { useMemo, useState } from "react";

const STATUS_STEPS = [
  { key: "SCHEDULED", label: "Booked", blurb: "Your appointment is locked in and the team has your details." },
  { key: "TRAVELING", label: "On the way", blurb: "Your tradie has left and is heading toward you now." },
  { key: "ON_SITE", label: "Arrived", blurb: "The team is on site and the work is underway." },
  { key: "COMPLETED", label: "Complete", blurb: "The job is done and feedback can be requested." },
] as const;

type StatusKey = (typeof STATUS_STEPS)[number]["key"];

const STATUS_CHOICES: Array<{
  key: StatusKey | "CANCELLED";
  label: string;
  eyebrow: string;
}> = [
  { key: "SCHEDULED", label: "Booked", eyebrow: "Confirmation view" },
  { key: "TRAVELING", label: "On the way", eyebrow: "Live arrival view" },
  { key: "ON_SITE", label: "Arrived", eyebrow: "Work in progress" },
  { key: "COMPLETED", label: "Complete", eyebrow: "Post-job follow-up" },
  { key: "CANCELLED", label: "Cancelled", eyebrow: "Exception state" },
];

function getStepIndex(status: StatusKey) {
  return STATUS_STEPS.findIndex((step) => step.key === status);
}

export function PortalPreviewClient() {
  const [status, setStatus] = useState<StatusKey | "CANCELLED">("TRAVELING");

  const activeStepIndex = useMemo(
    () => (status === "CANCELLED" ? -1 : getStepIndex(status)),
    [status],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,210,139,0.18),_transparent_30%),linear-gradient(180deg,_#f7fbfa_0%,_#eef4f7_48%,_#e8eef2_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
        <section className="w-full rounded-[32px] border border-white/70 bg-white/72 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:max-w-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700/80">
            Portal Preview
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Customer appointment page
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is a polished mock of the public job tracker. It is not wired to live data, but it mirrors the workflow the customer would see after receiving a portal link.
          </p>

          <div className="mt-6 space-y-3">
            {STATUS_CHOICES.map((choice) => {
              const active = choice.key === status;
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => setStatus(choice.key)}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    active
                      ? "border-emerald-300 bg-emerald-50 shadow-[0_10px_30px_rgba(0,210,139,0.12)]"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {choice.eyebrow}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{choice.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Workflow impact
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Customers get one lightweight page showing booking status, contact info, and feedback handoff. The biggest value is reducing uncertainty between booking and arrival.
            </p>
          </div>
        </section>

        <section className="flex w-full justify-center">
          <div className="w-full max-w-[420px] rounded-[40px] border border-slate-900/10 bg-[#dfe9ef] p-3 shadow-[0_30px_120px_rgba(15,23,42,0.18)]">
            <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-50">
              <div className="bg-[linear-gradient(180deg,_#0f172a_0%,_#17263e_100%)] px-6 pb-8 pt-5 text-white">
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.22em] text-white/70 uppercase">
                  <span>Northside Plumbing</span>
                  <span>Live job</span>
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight">Your appointment</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-200">
                  Stay updated without needing to call the office. This page refreshes automatically while the job is in progress.
                </p>
              </div>

              <div className="-mt-4 space-y-4 px-4 pb-5">
                <div className="rounded-[28px] border border-white bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Job</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">Hot Water System Repair</p>
                  <p className="mt-1 text-sm text-slate-500">Thursday 3 April, 2:00 PM</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {status === "CANCELLED" ? "Cancelled" : STATUS_CHOICES.find((choice) => choice.key === status)?.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      12 King St, Brisbane
                    </span>
                  </div>
                </div>

                {status === "CANCELLED" ? (
                  <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 shadow-[0_10px_30px_rgba(239,68,68,0.08)]">
                    <p className="text-sm font-semibold text-red-700">This appointment has been cancelled.</p>
                    <p className="mt-2 text-sm leading-6 text-red-600">
                      Questions? Call Northside Plumbing on 07 5555 0188 and the team can help with a new booking time.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-white bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                      {status === "TRAVELING" && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                          Live update
                        </span>
                      )}
                    </div>

                    <ol className="mt-5 space-y-4">
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = activeStepIndex > idx;
                        const isCurrent = activeStepIndex === idx;
                        return (
                          <li key={step.key} className="flex items-start gap-4">
                            <div
                              className={[
                                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
                                isDone
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : isCurrent
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-400",
                              ].join(" ")}
                            >
                              {isDone ? "✓" : idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={[
                                  "text-sm font-semibold",
                                  isDone
                                    ? "text-emerald-700"
                                    : isCurrent
                                      ? "text-blue-700"
                                      : "text-slate-400",
                                ].join(" ")}
                              >
                                {step.label}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">{step.blurb}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                {status === "COMPLETED" ? (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-center shadow-[0_10px_30px_rgba(0,210,139,0.10)]">
                    <p className="text-sm font-semibold text-emerald-800">Job complete. How did we do?</p>
                    <button
                      type="button"
                      className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Leave feedback
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                    <p className="text-sm text-slate-500">
                      Questions?{" "}
                      <a href="tel:0755550188" className="font-semibold text-slate-900 underline">
                        Call Northside Plumbing
                      </a>
                    </p>
                  </div>
                )}

                <p className="pb-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
                  Powered by Earlymark
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
