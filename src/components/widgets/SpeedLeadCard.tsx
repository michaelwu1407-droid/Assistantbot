"use client";

import { useEffect, useState } from "react";
import { BentoCard } from "./BentoCard";
import { Zap } from "lucide-react";

const TARGET_RESPONSE_SECONDS = 300; // 5-minute speed-to-lead target

export function SpeedLeadCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, TARGET_RESPONSE_SECONDS - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = (elapsed / TARGET_RESPONSE_SECONDS) * 100;

  const urgencyColor =
    progress < 50
      ? "text-emerald-400"
      : progress < 80
        ? "text-amber-400"
        : "text-red-400";

  const barColor =
    progress < 50
      ? "bg-emerald-500"
      : progress < 80
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <BentoCard title="Speed to Lead" subtitle="New inquiry response timer">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Zap className={`h-5 w-5 ${urgencyColor}`} />
          <span className={`text-3xl font-mono font-bold tabular-nums ${urgencyColor}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
        <div className="w-full">
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-500 uppercase tracking-wider">
            {remaining > 0 ? "Time remaining to respond" : "Response target missed"}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
