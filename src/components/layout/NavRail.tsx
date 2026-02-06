"use client";

import { motion } from "framer-motion";
import {
  Home,
  KanbanSquare,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  route: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", route: "/" },
  { icon: KanbanSquare, label: "Pipeline", route: "/pipeline" },
  { icon: Users, label: "Contacts", route: "/contacts" },
  { icon: FileText, label: "Invoices", route: "/invoices" },
];

interface NavRailProps {
  activeRoute?: string;
}

export function NavRail({ activeRoute }: NavRailProps) {
  return (
    <nav className="nav-rail" aria-label="Main navigation">
      {/* Logo */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm">
        Pj
      </div>

      {/* Nav Icons */}
      <div className="flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <NavIcon key={item.route} item={item} isActive={isActive} />
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        isActive
          ? "bg-slate-800 text-indigo-400"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
      }`}
      aria-label={item.label}
      title={item.label}
    >
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute inset-0 rounded-xl bg-slate-800"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon className="relative z-10 h-5 w-5" />
    </motion.button>
  );
}
