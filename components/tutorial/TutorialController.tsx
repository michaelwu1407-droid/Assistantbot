'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// ─── Step Definitions ───────────────────────────────────────────────────
export interface TutorialStep {
    id: string;
    targetId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

// All tutorial steps - granular coverage of every feature
export const TUTORIAL_STEPS: TutorialStep[] = [
    // Dashboard & Navigation
    { id: 'welcome', targetId: 'sidebar-nav', title: 'Welcome to Pj Buddy', description: 'This is your command center. The sidebar gives you quick access to all features.', position: 'right' },
    { id: 'nav-dashboard', targetId: 'hub-link', title: 'Dashboard Hub', description: 'Your home base. See your pipeline, stats, and quick actions at a glance.', position: 'right' },
    { id: 'nav-tradie', targetId: 'tradie-link', title: 'Tradie Mode', description: 'Switch to Tradie view for jobs, maps, and field work tools.', position: 'right' },
    { id: 'nav-agent', targetId: 'agent-link', title: 'Agent Mode', description: 'Switch to Real Estate Agent view for listings and buyer matching.', position: 'right' },
    { id: 'nav-settings', targetId: 'settings-link', title: 'Settings', description: 'Customize your workspace, profile, and preferences.', position: 'right' },

    // Pipeline & Deals
    { id: 'pipeline-board', targetId: 'pipeline-board', title: 'Your Pipeline', description: 'Drag and drop deals between stages. This is your visual workflow.', position: 'bottom' },
    { id: 'pipeline-stats', targetId: 'pipeline-stats', title: 'Pipeline Stats', description: 'Quick overview of your total value, healthy deals, and items needing attention.', position: 'bottom' },
    { id: 'btn-new-deal', targetId: 'btn-new-deal', title: 'Create New Deal', description: 'Click here to add a new job, listing, or deal to your pipeline.', position: 'bottom' },
    { id: 'deal-card', targetId: 'deal-card', title: 'Deal Cards', description: 'Each card represents a deal. Amber border = stale (>7 days). Red = rotting (>14 days).', position: 'bottom' },

    // Tradie Features (visible when on /dashboard/tradie)
    { id: 'nav-map', targetId: 'map-link', title: "Today's Map", description: 'See all your jobs plotted on a map with optimized routes.', position: 'right' },
    { id: 'nav-schedule', targetId: 'schedule-link', title: 'Schedule', description: 'View your calendar and upcoming appointments.', position: 'right' },
    { id: 'nav-estimator', targetId: 'estimator-link', title: 'Pocket Estimator', description: 'Generate quotes on the spot with material costs and labor.', position: 'right' },
    { id: 'nav-contacts', targetId: 'contacts-link', title: 'Contacts', description: 'Manage all your clients, leads, and buyers in one place.', position: 'right' },
    { id: 'pulse-widget', targetId: 'pulse-widget', title: 'The Pulse', description: 'Your financial snapshot: weekly earnings and outstanding invoices.', position: 'bottom' },

    // Agent Features  
    { id: 'speed-to-lead', targetId: 'speed-to-lead', title: 'Speed to Lead', description: 'New inquiries with time elapsed. Green = fresh, Red = old. Act fast!', position: 'bottom' },
    { id: 'matchmaker', targetId: 'matchmaker-feed', title: 'Buyer Matchmaker', description: 'AI matches buyers to listings based on budget and preferences.', position: 'left' },
    { id: 'commission-calc', targetId: 'commission-calc', title: 'Commission Calculator', description: 'Calculate your take-home based on sale price, commission %, and splits.', position: 'bottom' },
    { id: 'camera-fab', targetId: 'camera-fab', title: 'Camera', description: 'Capture photos as evidence. They auto-attach to the current job.', position: 'top' },

    // Assistant
    { id: 'assistant-pane', targetId: 'assistant-pane', title: 'Your AI Assistant', description: 'Type commands like "show stale deals" or "new job for Smith". The assistant does the rest.', position: 'left' },
    { id: 'mode-toggle', targetId: 'mode-toggle', title: 'Mode Toggle', description: 'Switch between Chat Mode (assistant-first) and Advanced Mode (full dashboard).', position: 'left' },

    // Search & Global
    { id: 'global-search', targetId: 'global-search', title: 'Global Search', description: 'Press Cmd+K to search everything: deals, contacts, jobs, and more.', position: 'bottom' },
    { id: 'notifications', targetId: 'notifications-btn', title: 'Notifications', description: 'Stay updated on deal changes, new leads, and system alerts.', position: 'bottom' },
];

// ─── Spotlight Overlay Component ────────────────────────────────────────
interface SpotlightProps {
    targetRect: DOMRect | null;
    step: TutorialStep;
    onNext: () => void;
    onSkip: () => void;
    currentIndex: number;
    totalSteps: number;
}

function SpotlightOverlay({ targetRect, step, onNext, onSkip, currentIndex, totalSteps }: SpotlightProps) {
    const isLastStep = currentIndex === totalSteps - 1;

    // Calculate card position based on step preference
    const getCardStyle = (): React.CSSProperties => {
        if (!targetRect) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        const padding = 16;
        const cardWidth = 320;
        const cardHeight = 180;

        switch (step.position) {
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
                };
            case 'top':
                return {
                    top: targetRect.top - cardHeight - padding,
                    left: Math.max(padding, Math.min(targetRect.left, window.innerWidth - cardWidth - padding)),
                };
            case 'left':
                return {
                    top: targetRect.top,
                    left: targetRect.left - cardWidth - padding,
                };
            case 'right':
            default:
                return {
                    top: targetRect.top,
                    left: targetRect.right + padding,
                };
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* SVG Mask for spotlight effect */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.75)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Highlight border around target */}
            {targetRect && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute border-2 border-blue-500 rounded-xl shadow-[0_0_0_4px_rgba(59,130,246,0.3)] pointer-events-none"
                    style={{
                        left: targetRect.left - 8,
                        top: targetRect.top - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}

            {/* Explanation Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute bg-white rounded-2xl shadow-2xl p-5 w-80 pointer-events-auto"
                style={getCardStyle()}
            >
                {/* Step counter */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">
                        Step {currentIndex + 1} of {totalSteps}
                    </span>
                    <button
                        onClick={onSkip}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{step.description}</p>

                {/* Progress bar */}
                <div className="h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                    />
                </div>

                {/* Navigation */}
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSkip}
                        className="flex-1 text-slate-500"
                    >
                        Skip Tutorial
                    </Button>
                    <Button
                        size="sm"
                        onClick={onNext}
                        className="flex-1 bg-slate-900 hover:bg-slate-800"
                    >
                        {isLastStep ? (
                            <>Finish <Check className="ml-1 w-4 h-4" /></>
                        ) : (
                            <>Next <ArrowRight className="ml-1 w-4 h-4" /></>
                        )}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Tutorial Controller ────────────────────────────────────────────────
interface TutorialControllerProps {
    onComplete: () => void;
}

export function TutorialController({ onComplete }: TutorialControllerProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [visibleSteps, setVisibleSteps] = useState<TutorialStep[]>([]);

    // Filter steps to only those with visible elements
    useEffect(() => {
        const visible = TUTORIAL_STEPS.filter(step => {
            const el = document.getElementById(step.targetId);
            return el !== null;
        });
        setVisibleSteps(visible.length > 0 ? visible : TUTORIAL_STEPS.slice(0, 5));
    }, []);

    // Update target rect when step changes
    const updateTargetRect = useCallback(() => {
        if (visibleSteps.length === 0) return;

        const step = visibleSteps[currentStep];
        if (!step) return;

        const element = document.getElementById(step.targetId);
        if (element) {
            setTargetRect(element.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [currentStep, visibleSteps]);

    useEffect(() => {
        updateTargetRect();

        // Update on scroll/resize
        window.addEventListener('scroll', updateTargetRect, true);
        window.addEventListener('resize', updateTargetRect);

        return () => {
            window.removeEventListener('scroll', updateTargetRect, true);
            window.removeEventListener('resize', updateTargetRect);
        };
    }, [updateTargetRect]);

    const handleNext = () => {
        if (currentStep < visibleSteps.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        onComplete();
        router.push('/dashboard');
    };

    if (visibleSteps.length === 0) {
        return null;
    }

    const step = visibleSteps[currentStep];
    if (!step) return null;

    return (
        <AnimatePresence>
            <SpotlightOverlay
                targetRect={targetRect}
                step={step}
                onNext={handleNext}
                onSkip={handleComplete}
                currentIndex={currentStep}
                totalSteps={visibleSteps.length}
            />
        </AnimatePresence>
    );
}

export default TutorialController;
