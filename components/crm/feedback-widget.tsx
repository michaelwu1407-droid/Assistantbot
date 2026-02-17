"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, MessageSquare, Star } from "lucide-react";
import { resolveFeedback } from "@/actions/feedback-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackItem {
    id: string;
    score: number;
    comment: string | null;
    resolved: boolean;
    resolution: string | null;
    contactName: string;
    dealTitle: string;
    createdAt: string;
}

interface FeedbackWidgetProps {
    feedback: FeedbackItem[];
}

function getScoreColor(score: number) {
    if (score >= 9) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 7) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
}

function getSentiment(score: number) {
    if (score >= 9) return { label: "Promoter", color: "bg-emerald-100 text-emerald-800" };
    if (score >= 7) return { label: "Neutral", color: "bg-slate-100 text-slate-800" };
    return { label: "At Risk", color: "bg-red-100 text-red-800" };
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
    const [resolving, setResolving] = useState(false);
    const [resolution, setResolution] = useState("");
    const [loading, setLoading] = useState(false);
    const [isResolved, setIsResolved] = useState(item.resolved);

    const sentiment = getSentiment(item.score);

    const handleResolve = async () => {
        if (!resolution.trim()) {
            toast.error("Please add resolution notes");
            return;
        }

        setLoading(true);
        try {
            const result = await resolveFeedback(item.id, resolution);
            if (result.success) {
                toast.success("Feedback resolved");
                setIsResolved(true);
                setResolving(false);
            } else {
                toast.error(result.error || "Failed to resolve");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className={cn("border", isResolved ? "border-slate-200 opacity-75" : "border-slate-200")}>
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border", getScoreColor(item.score))}>
                            {item.score}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-slate-900">{item.contactName}</p>
                            <p className="text-xs text-slate-500">{item.dealTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", sentiment.color)}>{sentiment.label}</Badge>
                        {isResolved && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Resolved
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Comment */}
                {item.comment && (
                    <div className="flex gap-2 p-3 rounded-lg bg-slate-50">
                        <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-700 italic">&ldquo;{item.comment}&rdquo;</p>
                    </div>
                )}

                {/* Resolution UI */}
                {item.resolution && isResolved && (
                    <div className="flex gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-800">{item.resolution}</p>
                    </div>
                )}

                {/* Action Buttons */}
                {!isResolved && item.score <= 6 && (
                    <div className="space-y-2">
                        {!resolving ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-700 flex-1">Low score — resolve before client posts a public review</p>
                                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100" onClick={() => setResolving(true)}>
                                    Resolve
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Internal resolution notes (e.g., 'Called client, offered discount on next job')"
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    rows={3}
                                    className="text-sm"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleResolve} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {loading ? "Saving..." : "Mark Resolved"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp */}
                <p className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
            </CardContent>
        </Card>
    );
}

export function FeedbackWidget({ feedback }: FeedbackWidgetProps) {
    const avgScore = feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length).toFixed(1)
        : "—";

    const unresolvedCount = feedback.filter(f => !f.resolved && f.score <= 6).length;

    return (
        <div className="space-y-4">
            {/* Summary Header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span className="text-2xl font-bold text-slate-900">{avgScore}</span>
                    <span className="text-sm text-slate-500">avg score</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <span className="text-sm text-slate-500">{feedback.length} responses</span>
                {unresolvedCount > 0 && (
                    <>
                        <div className="h-8 w-px bg-slate-200" />
                        <Badge className="bg-red-100 text-red-800 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {unresolvedCount} need attention
                        </Badge>
                    </>
                )}
            </div>

            {/* Feedback Cards */}
            <div className="space-y-3">
                {feedback.map((item) => (
                    <FeedbackCard key={item.id} item={item} />
                ))}
                {feedback.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        No feedback collected yet. Feedback requests are sent after job completion.
                    </div>
                )}
            </div>
        </div>
    );
}
