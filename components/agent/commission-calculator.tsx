"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export function CommissionCalculator() {
    const [salePrice, setSalePrice] = useState(1500000);
    const [commissionRate, setCommissionRate] = useState(2.2);
    const [agencySplit, setAgencySplit] = useState(40); // Agent keeps 40%

    const grossCommission = salePrice * (commissionRate / 100);
    const agentTakeHome = grossCommission * (agencySplit / 100);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(val);

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Commission Calc
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Sale Price */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Label>Sale Price</Label>
                        <span className="font-bold">{formatCurrency(salePrice)}</span>
                    </div>
                    <Slider
                        value={[salePrice]}
                        min={500000}
                        max={5000000}
                        step={10000}
                        onValueChange={(vals: number[]) => setSalePrice(vals[0])}
                        className="cursor-pointer"
                    />
                </div>

                {/* Commission Rate */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Label>Comm. Rate (%)</Label>
                        <span className="font-bold">{commissionRate.toFixed(1)}%</span>
                    </div>
                    <Slider
                        value={[commissionRate]}
                        min={1.0}
                        max={4.0}
                        step={0.1}
                        onValueChange={(vals: number[]) => setCommissionRate(vals[0])}
                        className="cursor-pointer"
                    />
                </div>

                {/* Agency Split */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Label>Your Split (%)</Label>
                        <span className="font-bold">{agencySplit}%</span>
                    </div>
                    <Slider
                        value={[agencySplit]}
                        min={10}
                        max={90}
                        step={5}
                        onValueChange={(vals: number[]) => setAgencySplit(vals[0])}
                        className="cursor-pointer"
                    />
                </div>

                {/* Results */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground">Gross Comm.</p>
                        <p className="text-sm font-medium text-slate-900">{formatCurrency(grossCommission)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Your Take Home</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(agentTakeHome)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
