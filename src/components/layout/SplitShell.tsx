"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavRail } from "./NavRail";

interface SplitShellProps {
  canvas: ReactNode;
  assistant: ReactNode;
  activeRoute?: string;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

export function SplitShell({ canvas, assistant, activeRoute }: SplitShellProps) {
  return (
    <div className="split-shell">
      {/* Navigation Rail */}
      <NavRail activeRoute={activeRoute} />

      {/* Left Pane: Canvas (65%) */}
      <main className="canvas-pane glass relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={springTransition}
            className="h-full"
          >
            {canvas}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Pane: Assistant (35%) */}
      <aside className="assistant-pane">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/50">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-medium text-slate-300">Pj Buddy</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{assistant}</div>
        <div className="p-4 border-t border-slate-800/50">
          <input
            type="text"
            placeholder="Ask Pj Buddy..."
            className="w-full rounded-lg bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </aside>
    </div>
  );
}
