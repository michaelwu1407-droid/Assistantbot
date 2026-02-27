"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { saveOnboardingData, type OnboardingFormData } from "@/actions/onboarding";
import { toast } from "sonner";
import { Loader2, Wrench, DollarSign, MapPin, Plus, Trash2, MessageSquare, ExternalLink } from "lucide-react";

const TRADE_TYPES = [
  "Plumber",
  "Sparky",
  "HVAC",
  "Carpenter",
  "Locksmith",
  "Other",
];

const STEPS = [
  { label: "Trade Profile", icon: Wrench },
  { label: "Money Rules", icon: DollarSign },
  { label: "Logistics", icon: MapPin },
  { label: "Assistant", icon: MessageSquare },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [tradeType, setTradeType] = useState("");
  const [website, setWebsite] = useState("");

  // Step 2
  const [bookOnly, setBookOnly] = useState(false);
  const [callOutFee, setCallOutFee] = useState(89);
  const [waiveFee, setWaiveFee] = useState(true);
  const [menuItems, setMenuItems] = useState([
    { name: "", price: 0 },
    { name: "", price: 0 },
    { name: "", price: 0 },
  ]);

  // Step 3
  const [baseSuburb, setBaseSuburb] = useState("");
  const [workHours, setWorkHours] = useState("Mon-Fri, 07:00-15:30");
  const [emergencyService, setEmergencyService] = useState(false);
  const [emergencySurcharge, setEmergencySurcharge] = useState(350);

  const whatsappNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || "+1234567890";
  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20Earlymark`;

  const canAdvance = () => {
    if (step === 0) return tradeType !== "";
    if (step === 1) return true;
    if (step === 2) return baseSuburb.trim() !== "";
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data: OnboardingFormData = {
        tradeType,
        website: website || "",
        pricingMode: bookOnly ? "BOOK_ONLY" : "CALL_OUT",
        callOutFee: bookOnly ? undefined : callOutFee,
        waiveFee: bookOnly ? undefined : waiveFee,
        menuItems: bookOnly
          ? undefined
          : menuItems.filter((i) => i.name.trim() !== ""),
        baseSuburb,
        standardWorkHours: workHours,
        emergencyService,
        emergencySurcharge: emergencyService ? emergencySurcharge : undefined,
      };

      // userId is resolved server-side via auth — we pass it from a hidden mechanism
      // For now the action reads it from the session. We'll pass a placeholder.
      const result = await saveOnboardingData("__current_user__", data);
      if (result.success) {
        toast.success("You're all set! Redirecting to dashboard...");
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateMenuItem = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    setMenuItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "price" ? Number(value) || 0 : value }
          : item
      )
    );
  };

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, { name: "", price: 0 }]);
  };

  const removeMenuItem = (index: number) => {
    if (menuItems.length <= 1) return;
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Set up Travis
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Tell your AI agent how to run your business.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive
                      ? "bg-emerald-600 text-white scale-110"
                      : isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-400"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs font-medium ${isActive
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-400"
                    }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardContent className="p-6 space-y-6">
            {/* ─── Step 1: Trade Profile ─── */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>What trade are you in?</Label>
                  <Select value={tradeType} onValueChange={setTradeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Website (optional)</Label>
                  <Input
                    placeholder="https://yoursite.com.au"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ─── Step 2: Money Rules ─── */}
            {step === 1 && (
              <>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Book Only Mode</p>
                    <p className="text-xs text-slate-500">
                      Travis never quotes prices. He only books site visits.
                    </p>
                  </div>
                  <Switch checked={bookOnly} onCheckedChange={setBookOnly} />
                </div>

                {!bookOnly && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <Label>Call-Out Fee ($)</Label>
                      <Input
                        type="number"
                        value={callOutFee}
                        onChange={(e) => setCallOutFee(Number(e.target.value))}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-sm">Waive fee if job proceeds?</p>
                        <p className="text-xs text-slate-500">
                          Call-out fee is absorbed into the final invoice.
                        </p>
                      </div>
                      <Switch checked={waiveFee} onCheckedChange={setWaiveFee} />
                    </div>

                    <div className="space-y-3">
                      <Label>Common Jobs & Prices</Label>
                      {menuItems.map((item, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            placeholder="e.g. Tap Replacement"
                            value={item.name}
                            onChange={(e) =>
                              updateMenuItem(i, "name", e.target.value)
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="$"
                            value={item.price || ""}
                            onChange={(e) =>
                              updateMenuItem(i, "price", e.target.value)
                            }
                            className="w-24"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMenuItem(i)}
                            className="shrink-0 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addMenuItem}
                        className="gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Row
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─── Step 3: Logistics ─── */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Base Suburb</Label>
                  <Input
                    placeholder="e.g. Parramatta"
                    value={baseSuburb}
                    onChange={(e) => setBaseSuburb(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Travis uses this to estimate travel times.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Standard Work Hours</Label>
                  <Input
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Emergency / After-Hours?</p>
                    <p className="text-xs text-slate-500">
                      Allow Travis to accept emergency callouts.
                    </p>
                  </div>
                  <Switch
                    checked={emergencyService}
                    onCheckedChange={setEmergencyService}
                  />
                </div>

                {emergencyService && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <Label>Emergency Surcharge ($)</Label>
                    <Input
                      type="number"
                      value={emergencySurcharge}
                      onChange={(e) =>
                        setEmergencySurcharge(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </>
            )}

            {/* ─── Step 4: Connecting the Assistant ─── */}
            {step === 3 && (
              <div className="space-y-6 text-center animate-in fade-in duration-300 py-4">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Connect your AI Assistant</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Manage your business via chat while on the road. Travis is available 24/7 on WhatsApp.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-xs mx-auto space-y-4">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Your Assistant Number:
                  </div>
                  <div className="text-xl font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all tracking-wide">
                    {whatsappNumber}
                  </div>
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> Message Travis
                    </a>
                  </Button>
                </div>

                <p className="text-xs text-slate-400">
                  Tip: Save this number to your contacts for easy access.
                </p>
              </div>
            )}

            {/* ─── Navigation ─── */}
            <div className="flex justify-between pt-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canAdvance()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
