"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface BentoCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function BentoCard({
  title,
  subtitle,
  children,
  className = "",
}: BentoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bento-card ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}
