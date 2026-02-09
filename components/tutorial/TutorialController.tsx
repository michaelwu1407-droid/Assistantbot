'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, MessageSquare, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// ─── Step Definitions with Chat Commands ────────────────────────────────
export interface TutorialStep {
    id: string;
    targetId: string;
    title: string;
    description: string;
    chatCommand?: string;  // What user can type in chatbot
    chatResponse?: string; // What the assistant would respond
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    // Navigation
    {
        id: 'welcome',
        targetId: 'sidebar-nav',
        title: 'Welcome to Pj Buddy',
        description: 'The sidebar gives you quick access to all features.',
        chatCommand: 'What can you do?',
        chatResponse: 'I can help you manage deals, contacts, and more. Try saying "show my pipeline" or "new job for Smith".',
        position: 'right'
    },
    {
        id: 'nav-dashboard',
        targetId: 'hub-link',
        title: 'Dashboard Hub',
        description: 'Your home base for pipeline overview and stats.',
        chatCommand: 'Show my dashboard',
        chatResponse: 'Opening your dashboard...',
        position: 'right'
    },
    {
        id: 'nav-tradie',
        targetId: 'tradie-link',
        title: 'Tradie Mode',
        description: 'Switch to Tradie view for jobs and field work.',
        chatCommand: 'Switch to tradie mode',
        chatResponse: 'Switching to Tradie view with jobs, map, and estimator.',
        position: 'right'
    },
    {
        id: 'nav-agent',
        targetId: 'agent-link',
        title: 'Agent Mode',
        description: 'Real estate agent tools for listings and buyers.',
        chatCommand: 'Switch to agent mode',
        chatResponse: 'Switching to Agent view with listings and buyer matching.',
        position: 'right'
    },
    // Pipeline
    {
        id: 'pipeline-board',
        targetId: 'kanban-board',
        title: 'Your Pipeline',
        description: 'Drag and drop deals between stages.',
        chatCommand: 'Show stale deals',
        chatResponse: 'Found 2 stale deals not updated in 7+ days.',
        position: 'bottom'
    },
    {
        id: 'pipeline-stats',
        targetId: 'pipeline-stats',
        title: 'Pipeline Stats',
        description: 'Total value, active deals at a glance.',
        chatCommand: "What's my pipeline value?",
        chatResponse: 'Your pipeline value is $185,000 across 3 active deals.',
        position: 'bottom'
    },
    {
        id: 'btn-new-deal',
        targetId: 'btn-new-deal',
        title: 'Create New Deal',
        description: 'Add a new job or listing to your pipeline.',
        chatCommand: 'New job for Acme Corp, $15000',
        chatResponse: 'Created new deal "Acme Corp" in New Lead stage.',
        position: 'left'
    },
    // Assistant
    {
        id: 'assistant-pane',
        targetId: 'assistant-pane',
        title: 'Your AI Assistant',
        description: 'Type natural language commands here.',
        chatCommand: 'What can I ask you?',
        chatResponse: 'Try: "new contact John Smith", "show today\'s jobs", "generate quote $500 labor"',
        position: 'left'
    },
    {
        id: 'mode-toggle',
        targetId: 'mode-toggle',
        title: 'Mode Toggle',
        description: 'Switch between Chat Mode and Advanced Mode.',
        chatCommand: 'Switch to basic mode',
        chatResponse: 'Switching to Basic Mode - I\'ll be your primary interface.',
        position: 'left'
    },
    // Global
    {
        id: 'global-search',
        targetId: 'global-search',
        title: 'Global Search',
        description: 'Press ⌘K to search everything.',
        chatCommand: 'Find contact Smith',
        chatResponse: 'Found 2 contacts matching "Smith"...',
        position: 'bottom'
    },
];

// ─── Chat Bubble Component ──────────────────────────────────────────────
function ChatPreview({ command, response }: { command?: string; response?: string }) {
    if (!command) return null;

    return (
        <div className="space-y-3">
            {/* User message */}
            <div className="flex justify-end">
                <div className="bg-slate-900 text-white px-3 py-2 rounded-2xl rounded-br-md text-sm max-w-[80%]">
                    {command}
                </div>
            </div>
            {/* Assistant response */}
            {response && (
                <div className="flex justify-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="bg-slate-100 text-slate-700 px-3 py-2 rounded-2xl rounded-bl-md text-sm max-w-[80%]">
                        {response}
                    </div>
                </div>
            )}
        </div>
    );
}

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

    // Calculate card position - CLAMP to viewport
    const getCardStyle = (): React.CSSProperties => {
        const cardWidth = 360;
        const cardHeight = 280;
        const padding = 16;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

        if (!targetRect) {
            return {
                top: Math.max(padding, (viewportHeight - cardHeight) / 2),
                left: Math.max(padding, (viewportWidth - cardWidth) / 2),
            };
        }

        let top = targetRect.top;
        let left = targetRect.right + padding;

        // Calculate based on position preference
        switch (step.position) {
            case 'bottom':
                top = targetRect.bottom + padding;
                left = targetRect.left;
                break;
            case 'top':
                top = targetRect.top - cardHeight - padding;
                left = targetRect.left;
                break;
            case 'left':
                top = targetRect.top;
                left = targetRect.left - cardWidth - padding;
                break;
            case 'right':
            default:
                top = targetRect.top;
                left = targetRect.right + padding;
                break;
        }

        // CLAMP to viewport bounds
        top = Math.max(padding, Math.min(top, viewportHeight - cardHeight - padding));
        left = Math.max(padding, Math.min(left, viewportWidth - cardWidth - padding));

        return { top, left };
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
                    fill="rgba(0, 0, 0, 0.7)"
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

            {/* Explanation Card with Chat Preview */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                style={{ ...getCardStyle(), width: 360 }}
            >
                {/* Header */}
                <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                        Step {currentIndex + 1} of {totalSteps}
                    </span>
                    <button
                        onClick={onSkip}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-sm text-slate-600 mb-3">{step.description}</p>

                    {/* Chat Command Preview */}
                    {step.chatCommand && (
                        <div className="mb-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 mb-2">
                                <MessageSquare className="w-3 h-3" />
                                <span>Or just say...</span>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-3 border">
                                <ChatPreview command={step.chatCommand} response={step.chatResponse} />
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="h-1 bg-slate-100 rounded-full mb-3 overflow-hidden">
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
                            Skip
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
