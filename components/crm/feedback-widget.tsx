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
    if (score >= 9) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 7) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (score >= 5) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
}

function getSentiment(score: number) {
    if (score >= 9) return { label: "Promoter", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    if (score >= 7) return { label: "Neutral", color: "bg-muted text-muted-foreground border-border/50" };
    return { label: "At Risk", color: "bg-red-500/10 text-red-500 border-red-500/20" };
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
        <Card className={cn("border-border/50 glass-card transition-all", isResolved ? "opacity-75" : "")}>
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border", getScoreColor(item.score))}>
                            {item.score}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-foreground">{item.contactName}</p>
                            <p className="text-xs text-muted-foreground">{item.dealTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs border", sentiment.color)}>{sentiment.label}</Badge>
                        {isResolved && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Resolved
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Comment */}
                {item.comment && (
                    <div className="flex gap-2 p-3 rounded-lg bg-muted/30">
                        <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground/80 italic">&ldquo;{item.comment}&rdquo;</p>
                    </div>
                )}

                {/* Resolution UI */}
                {item.resolution && isResolved && (
                    <div className="flex gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{item.resolution}</p>
                    </div>
                )}

                {/* Action Buttons */}
                {!isResolved && item.score <= 6 && (
                    <div className="space-y-2">
                        {!resolving ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-600 dark:text-red-400 flex-1">Low score — resolve before client posts a public review</p>
                                <Button size="sm" variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => setResolving(true)}>
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
                                    className="text-sm bg-background/50 border-border/50"
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
                <p className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
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
            <div className="flex items-center gap-4 p-4 rounded-xl glass-card border border-border/50">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span className="text-2xl font-bold text-foreground">{avgScore}</span>
                    <span className="text-sm text-muted-foreground">avg score</span>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <span className="text-sm text-muted-foreground">{feedback.length} responses</span>
                {unresolvedCount > 0 && (
                    <>
                        <div className="h-8 w-px bg-border/50" />
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
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
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No feedback collected yet. Feedback requests are sent after job completion.
                    </div>
                )}
            </div>
        </div>
    );
}
