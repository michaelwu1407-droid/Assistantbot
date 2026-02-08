"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, DollarSign, Percent, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommissionCalculator() {
    const [salePrice, setSalePrice] = useState(1500000);
    const [commissionRate, setCommissionRate] = useState(2.2);
    const [agencySplit, setAgencySplit] = useState(40); // Agent keeps 40%

    // Calculate derived values
    const grossCommission = salePrice * (commissionRate / 100);
    const agentTakeHome = grossCommission * (agencySplit / 100);
    const agencyKeep = grossCommission - agentTakeHome;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(val);

    // Handle manual input for sale price
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
        setSalePrice(val);
    };

    return (
        <Card className="h-full border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 p-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-emerald-400" />
                        Commission Calculator
                    </h3>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                </div>
            </div>

            <CardContent className="space-y-8 p-6">
                {/* Sale Price Input */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-slate-600 font-medium">Sale Price</Label>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-mono">
                            {formatCurrency(salePrice)}
                        </span>
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            value={salePrice.toLocaleString()}
                            onChange={handlePriceChange}
                            className="pl-9 font-bold text-lg border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                    <Slider
                        value={[salePrice]}
                        min={500000}
                        max={5000000}
                        step={10000}
                        onValueChange={(vals) => setSalePrice(vals[0])}
                        className="cursor-pointer"
                    />
                </div>

                <div className="grid grid-cols-2 gap-8">
                    {/* Commission Rate */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-600">Rate</Label>
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                {commissionRate.toFixed(1)}%
                            </span>
                        </div>
                        <Slider
                            value={[commissionRate]}
                            min={1.0}
                            max={4.0}
                            step={0.1}
                            onValueChange={(vals) => setCommissionRate(vals[0])}
                            className="cursor-pointer"
                        />
                    </div>

                    {/* Agency Split */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-slate-600">Your Split</Label>
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {agencySplit}%
                            </span>
                        </div>
                        <Slider
                            value={[agencySplit]}
                            min={10}
                            max={90}
                            step={5}
                            onValueChange={(vals) => setAgencySplit(vals[0])}
                            className="cursor-pointer"
                        />
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Total Commission</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(grossCommission)}</span>
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Agency Cut ({100 - agencySplit}%)</span>
                        <span className="font-medium text-slate-400">{formatCurrency(agencyKeep)}</span>
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Your Take Home</span>
                            <span className="text-2xl font-black text-emerald-600 tracking-tight">
                                {formatCurrency(agentTakeHome)}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                style={{ width: `${agencySplit}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
