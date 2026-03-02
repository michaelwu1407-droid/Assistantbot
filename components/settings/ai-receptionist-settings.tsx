"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Loader2, Headphones } from "lucide-react";
import { getPhoneNumberStatus } from "@/actions/phone-settings";

/** Encode # for use in tel: links (USSD codes). */
const HASH = "%23";

export function AIReceptionistSettings() {
  const [status, setStatus] = useState<{
    phoneNumber: string | null;
    name: string | null;
    hasPhoneNumber: boolean;
    personalPhone: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPhoneNumberStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus({
          phoneNumber: data.phoneNumber ?? null,
          name: data.name ?? null,
          hasPhoneNumber: !!data.hasPhoneNumber,
          personalPhone: data.personalPhone ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load phone settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status?.hasPhoneNumber || !status.phoneNumber) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-emerald-600" />
            <CardTitle>AI Receptionist & Call Forwarding</CardTitle>
          </div>
          <CardDescription>
            Forward your incoming calls to Tracey so you never miss a job while on the tools. Set up your business phone number above first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once your AI agent phone number is configured, you can use the options here to forward calls from your personal phone (e.g. from Google Ads, hipages, Airtasker) to Tracey.
          </p>
        </CardContent>
      </Card>
    );
  }

  // USSD: use digits only (no +). Australian numbers: ensure 61 prefix.
  const raw = status.phoneNumber.replace(/\D/g, "");
  const agentDigits = raw.startsWith("61") ? raw : raw.startsWith("0") ? "61" + raw.slice(1) : "61" + raw;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-emerald-600" />
          <CardTitle>AI Receptionist & Call Forwarding</CardTitle>
        </div>
        <CardDescription>
          Forward calls to Tracey so you never miss a job while on the tools. Use these one-tap options on your mobile to turn forwarding on or off. Works with calls from Google Ads, hipages, Airtasker, and your main business line.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tracey (AI) number</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-sm">
            <Phone className="h-4 w-4 text-emerald-600" />
            {status.phoneNumber}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          On your mobile, tap a button below. Your carrier will set up call forwarding to Tracey. Tap &quot;Turn Off AI&quot; when you want to take calls directly again.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            asChild
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <a href={`tel:**21*${agentDigits}${HASH}`} title="Forward all calls to Tracey">
              Enable 100% AI Receptionist
            </a>
          </Button>
          <Button asChild variant="secondary" className="border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/50">
            <a href={`tel:**004*${agentDigits}${HASH}`} title="Forward if busy/unanswered">
              Backup AI Receptionist
            </a>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            <a href={`tel:##002${HASH}`} title="Disable call forwarding">
              Turn Off AI
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Green: forwards every call to Tracey. Blue: forwards only if you don’t answer (e.g. after ~15s). Gray: disables forwarding so calls ring your phone.
        </p>
      </CardContent>
    </Card>
  );
}
