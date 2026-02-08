"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Send, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export function VendorReportCard() {
    const handleSendReport = () => {
        toast.success("Vendor Report sent via WhatsApp!");
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                    <FileBarChart className="h-4 w-4" /> Vendor Feedback
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vendor Goal</span>
                        <span className="font-semibold">$1.8M</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Market Feedback</span>
                        <span className="font-semibold text-amber-600">$1.65M</span>
                    </div>
                    {/* Simple Visual Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full mt-2 overflow-hidden flex">
                        <div className="h-full bg-amber-500 w-[80%]" title="Market Feedback" />
                        <div className="h-full bg-transparent w-[10%]" />
                        {/* Gap to show goal is higher */}
                        <div className="h-full bg-slate-300 w-[10%] border-l border-white" title="Gap to Goal" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                        <div className="flex items-center gap-1 text-green-700 text-xs font-medium mb-1">
                            <TrendingUp className="h-3 w-3" /> Interest
                        </div>
                        <p className="text-lg font-bold text-green-900">High</p>
                    </div>
                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                        <div className="flex items-center gap-1 text-amber-700 text-xs font-medium mb-1">
                            <TrendingDown className="h-3 w-3" /> Price
                        </div>
                        <p className="text-lg font-bold text-amber-900">Soft</p>
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
