"use client";

import { cn } from "@/lib/utils";
import { DollarSign, AlertCircle } from "lucide-react";

interface PulseWidgetProps {
    mode: "tradie" | "agent";
}

export function PulseWidget({ mode }: PulseWidgetProps) {
    const isTradie = mode === "tradie";

    return (
        <div className={cn(
            "fixed bottom-20 right-4 z-40 flex flex-col gap-2 pointer-events-none md:pointer-events-auto md:bottom-auto md:top-4 md:right-4 md:fixed",
            // On mobile, sits above bottom sheet/nav. On Desktop, sits top right
        )}>
            <div className={cn(
                "rounded-full px-4 py-2 shadow-lg flex items-center gap-4 backdrop-blur-md border",
                isTradie
                    ? "bg-slate-900/90 text-white border-slate-700"
                    : "bg-white/90 text-slate-900 border-indigo-100"
            )}>
                <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded-full", isTradie ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")}>
                        <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] opacity-70 uppercase tracking-wide">Weekly</span>
                        <span className="font-bold text-sm">$4,250</span>
                    </div>
                </div>

                <div className={cn("w-px h-6", isTradie ? "bg-slate-700" : "bg-indigo-100")} />

                <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded-full", isTradie ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")}>
                        <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] opacity-70 uppercase tracking-wide">Owe</span>
                        <span className="font-bold text-sm">$850</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
