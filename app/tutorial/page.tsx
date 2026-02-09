'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/core/sidebar';
import { AssistantPane } from '@/components/core/assistant-pane';
import { TutorialController } from '@/components/tutorial/TutorialController';
import { DashboardProvider } from '@/components/providers/dashboard-provider';

export default function TutorialPage() {
    const [tutorialComplete, setTutorialComplete] = useState(false);

    if (tutorialComplete) {
        // Redirect handled by TutorialController
        return null;
    }

    return (
        <DashboardProvider>
            <div className="flex h-screen w-full bg-slate-100">
                {/* Real Sidebar */}
                <Sidebar />

                {/* Main Content Area - Mock Pipeline */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                            <p className="text-sm text-slate-500">Welcome to Pj Buddy</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button id="global-search" className="px-3 py-1.5 text-sm text-slate-400 bg-slate-100 rounded-lg border border-slate-200">
                                ⌘K Search
                            </button>
                            <button id="notifications-btn" className="p-2 rounded-lg hover:bg-slate-100">
                                🔔
                            </button>
                        </div>
                    </header>

                    {/* Pipeline Area */}
                    <div className="flex-1 p-6 overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div id="pipeline-stats" className="flex gap-4">
                                <div className="bg-white rounded-xl border px-4 py-3">
                                    <p className="text-xs text-slate-500">Pipeline Value</p>
                                    <p className="text-lg font-bold text-slate-900">$185,000</p>
                                </div>
                                <div className="bg-white rounded-xl border px-4 py-3">
                                    <p className="text-xs text-slate-500">Active Deals</p>
                                    <p className="text-lg font-bold text-emerald-600">3</p>
                                </div>
                            </div>
                            <button id="btn-new-deal" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
                                + New Deal
                            </button>
                        </div>

                        {/* Kanban Preview */}
                        <div id="kanban-board" className="flex gap-4">
                            {['New Lead', 'Contacted', 'Negotiation', 'Won'].map((col, i) => (
                                <div key={col} className="w-72 flex-shrink-0">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`w-2 h-2 rounded-full ${['bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500'][i]}`} />
                                        <span className="font-semibold text-slate-700 text-sm">{col}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border p-2 min-h-[200px]">
                                        {i === 0 && (
                                            <div id="deal-card" className="bg-white rounded-lg border p-3 mb-2">
                                                <p className="font-semibold text-sm text-slate-900">Website Redesign</p>
                                                <p className="text-xs text-slate-500">Acme Corp</p>
                                                <p className="text-sm font-bold text-slate-900 mt-2">$15,000</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Assistant Pane */}
                <aside className="w-[400px] border-l bg-white">
                    <AssistantPane />
                </aside>

                {/* Tutorial Overlay */}
                <TutorialController onComplete={() => setTutorialComplete(true)} />
            </div>
        </DashboardProvider>
    );
}
