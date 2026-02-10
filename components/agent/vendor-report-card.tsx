"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Send, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export interface VendorReportData {
    listingTitle: string;
    vendorGoalPrice: number | null;
    marketFeedback: number | null; // This might need to be calculated or passed
    interestLevel: "High" | "Medium" | "Low";
    priceFeedback: "Soft" | "On Target" | "Strong";
    averagePriceOpinion?: number | null;
}

export function VendorReportCard({ data }: { data?: VendorReportData }) {
    if (!data) return null;

    const handleSendReport = () => {
        toast.success(`Vendor Report for ${data.listingTitle} sent!`);
    };

    const goal = data.vendorGoalPrice || 0;
    const feedback = data.averagePriceOpinion || 0;
    const percentage = goal > 0 ? Math.min((feedback / goal) * 100, 100) : 0;

    return (
        <Card className="h-full flex flex-col border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                    <FileBarChart className="h-4 w-4" /> Vendor Feedback
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Vendor Goal</span>
                        <span className="font-semibold">${goal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Market Feedback</span>
                        <span className="font-semibold text-amber-600">${feedback.toLocaleString()}</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden flex relative">
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${percentage}%` }} title="Market Feedback" />
                        {percentage < 100 && (
                            <div className="h-full bg-slate-200" style={{ width: `${100 - percentage}%` }} />
                        )}
                        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-slate-400" title="Goal" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                        <div className="flex items-center gap-1 text-green-700 text-xs font-medium mb-1">
                            <TrendingUp className="h-3 w-3" /> Interest
                        </div>
                        <p className="text-lg font-bold text-green-900">{data.interestLevel}</p>
                    </div>
                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                        <div className="flex items-center gap-1 text-amber-700 text-xs font-medium mb-1">
                            <TrendingDown className="h-3 w-3" /> Price
                        </div>
                        <p className="text-lg font-bold text-amber-900">{data.priceFeedback}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSendReport} variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50">
                    <Send className="mr-2 h-4 w-4" /> Send Weekly Report
                </Button>
            </CardFooter>
        </Card>
    );
}
