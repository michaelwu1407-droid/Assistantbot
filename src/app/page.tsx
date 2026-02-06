"use client";

import { SplitShell } from "@/components/layout/SplitShell";
import { QuickQuoteCard } from "@/components/widgets/QuickQuoteCard";
import { SpeedLeadCard } from "@/components/widgets/SpeedLeadCard";
import { BentoCard } from "@/components/widgets/BentoCard";
import { motion } from "framer-motion";
import { TrendingUp, Users, KanbanSquare } from "lucide-react";

function DashboardCanvas() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your workspace at a glance
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Deals", value: "12", icon: KanbanSquare, delta: "+3" },
          { label: "Contacts", value: "48", icon: Users, delta: "+7" },
          { label: "Revenue", value: "$24.5k", icon: TrendingUp, delta: "+12%" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: i * 0.08,
            }}
          >
            <BentoCard title={stat.label}>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-100">
                  {stat.value}
                </span>
                <span className="text-xs font-medium text-emerald-400">
                  {stat.delta}
                </span>
              </div>
            </BentoCard>
          </motion.div>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
        >
          <QuickQuoteCard />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.35 }}
        >
          <SpeedLeadCard />
        </motion.div>
      </div>
    </div>
  );
}

function AssistantPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-slate-800/50 px-4 py-3">
        <p className="text-sm text-slate-300">
          Hey! I&apos;m your Pj Buddy assistant. Ask me anything about your
          pipeline, contacts, or deals.
        </p>
      </div>
      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-3">
        <p className="text-xs font-medium text-indigo-400">Tip</p>
        <p className="mt-1 text-sm text-slate-400">
          Try &quot;Show me stale deals&quot; or &quot;Generate a quick quote&quot;
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <SplitShell
      canvas={<DashboardCanvas />}
      assistant={<AssistantPanel />}
      activeRoute="/"
    />
  );
}
