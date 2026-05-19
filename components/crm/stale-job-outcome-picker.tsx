"use client";

import React from "react";
import { CheckCircle, Clock, PauseCircle, UserX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActualOutcome, ACTUAL_OUTCOME_OPTIONS } from "@/lib/deal-utils";

type OutcomeMeta = {
  value: ActualOutcome;
  label: string;
  short: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconWrapClass: string;
};

const META: Record<ActualOutcome, Omit<OutcomeMeta, "value" | "label">> = {
  COMPLETED: { short: "Job is done", Icon: CheckCircle, iconWrapClass: "bg-emerald-100 text-emerald-700" },
  RESCHEDULED: { short: "Clears the date — book a new time", Icon: Clock, iconWrapClass: "bg-blue-100 text-blue-700" },
  PARKED: { short: "Follow up when customer is ready", Icon: PauseCircle, iconWrapClass: "bg-violet-100 text-violet-700" },
  NO_SHOW: { short: "Customer didn't show", Icon: UserX, iconWrapClass: "bg-orange-100 text-orange-700" },
  CANCELLED: { short: "Close the job out of pipeline", Icon: X, iconWrapClass: "bg-rose-100 text-rose-700" },
};

const ORDERED: OutcomeMeta[] = ACTUAL_OUTCOME_OPTIONS.map((opt) => ({
  value: opt.value as ActualOutcome,
  label: opt.label,
  ...META[opt.value as ActualOutcome],
}));

interface Props {
  value: ActualOutcome | "";
  onChange: (v: ActualOutcome) => void;
  layout: "grid" | "list";
}

export function StaleJobOutcomePicker({ value, onChange, layout }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Job outcome"
      className={cn(
        layout === "grid" ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2",
      )}
    >
      {ORDERED.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "group flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
              "focus-visible:outline-none",
              selected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                option.iconWrapClass,
              )}
              aria-hidden="true"
            >
              <option.Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="app-panel-title block truncate">{option.label}</span>
              <span className="app-body-secondary block truncate">{option.short}</span>
            </span>
            <span
              className={cn(
                "ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
              )}
              aria-hidden="true"
            >
              {selected ? <CheckCircle className="h-3 w-3" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function staleJobOutcomeLabel(outcome: ActualOutcome | ""): string {
  if (!outcome) return "Update job";
  const meta = ORDERED.find((o) => o.value === outcome);
  if (!meta) return "Update job";
  switch (outcome) {
    case "COMPLETED": return "Mark completed";
    case "RESCHEDULED": return "Mark rescheduled";
    case "PARKED": return "Park job";
    case "NO_SHOW": return "Mark no-show";
    case "CANCELLED": return "Mark cancelled";
    default: return `Mark ${meta.label.toLowerCase()}`;
  }
}
