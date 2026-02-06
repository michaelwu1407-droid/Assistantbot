"use client";

import { BentoCard } from "./BentoCard";
import { Wrench, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface RecentJob {
  id: string;
  title: string;
  value: number;
  status: string;
}

const mockJobs: RecentJob[] = [
  { id: "1", title: "Hot Water Replacement", value: 2800, status: "Quoted" },
  { id: "2", title: "Switchboard Upgrade", value: 1450, status: "In Progress" },
  { id: "3", title: "Blocked Drain Repair", value: 650, status: "New" },
];

const statusColors: Record<string, string> = {
  Quoted: "text-amber-400 bg-amber-400/10",
  "In Progress": "text-blue-400 bg-blue-400/10",
  New: "text-emerald-400 bg-emerald-400/10",
};

export function QuickQuoteCard() {
  return (
    <BentoCard title="Quick Quote" subtitle="Recent jobs at a glance">
      <div className="space-y-3">
        {mockJobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: i * 0.05,
            }}
            className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2.5 group cursor-pointer hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-200">{job.title}</p>
                <p className="text-xs text-slate-500">
                  ${job.value.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  statusColors[job.status] ?? "text-slate-400 bg-slate-400/10"
                }`}
              >
                {job.status}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>
    </BentoCard>
  );
}
