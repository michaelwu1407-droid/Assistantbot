"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { getOnboardingProgress } from "@/actions/onboarding-actions";

export function SetupWidget() {
    const [data, setData] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        getOnboardingProgress().then((res) => {
            /* If "shouldShow" is false, we don't render. 
               But if the user expands, we animate the height */
            if (res && res.shouldShow && res.total > 0) {
                setData(res);
            }
        });
    }, []);

    if (!data || !data.shouldShow) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden mb-6 shadow-sm transition-all duration-300">
            <div
                className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1 rounded-full text-sm">
                        {data.completed}/{data.total}
                    </div>
                    <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                        Complete your setup!
                    </h3>
                </div>
                <button className="text-emerald-700 dark:text-emerald-400 p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded">
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {expanded && (
                <div className="p-4 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-emerald-100 dark:border-emerald-800/50">
                    {data.steps.map((step: any) => (
                        <Link key={step.id} href={step.href}>
                            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${step.isComplete
                                    ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/5 text-emerald-800 dark:text-emerald-300"
                                    : "border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                }`}>
                                {step.isComplete ? (
                                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                                ) : (
                                    <Circle className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-400 w-5 h-5 shrink-0" />
                                )}
                                <span className={`text-sm ${step.isComplete ? 'opacity-80' : 'font-medium'}`}>
                                    {step.title}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
