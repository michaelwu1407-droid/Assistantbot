"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Phone, Activity, BookOpen, GraduationCap } from "lucide-react";
import { useShellStore } from "@/lib/store";

const handbookSections = [
  {
    title: "Onboarding",
    content:
      "Setup captures business details, hours, pricing context, lead-source preferences, call routing, and inbox connection so Tracey can start handling leads immediately.",
  },
  {
    title: "AI assistant modes",
    content:
      "Execution = Tracey may act directly, Review & approve = Tracey drafts and you confirm, Info only = Tracey answers and captures details without making commitments. Change this in Settings -> AI Assistant.",
  },
  {
    title: "Calls, texts, and lead capture",
    content:
      "Automated calling and texting controls phone behavior and templates. Integrations handles inbox lead capture and optional immediate-callback behavior.",
  },
  {
    title: "Scheduling and routing",
    content:
      "Use chat commands for availability checks, rescheduling, and daily planning. Tracey schedules within your configured working window.",
  },
  {
    title: "Pricing and refusal rules",
    content:
      "Manage pricing ranges and refusal rules in Settings -> My business so Tracey can quote consistently and decline unsupported requests.",
  },
];

export default function HelpSettingsPage() {
  const router = useRouter();
  const { resetTutorial } = useShellStore();

  const handleRestartTutorial = () => {
    resetTutorial();
    router.push("/crm");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Help</h2>
        <p className="text-muted-foreground mt-1">Support, handbook, and system status.</p>
      </div>

      {/* Restart Tutorial Card */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Guided tutorial
          </CardTitle>
          <CardDescription>Walk through Tracey&apos;s features with the interactive step-by-step tutorial.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRestartTutorial} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Restart tutorial
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Support and feedback
          </CardTitle>
          <CardDescription>Create a support request or contact the team directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" asChild>
            <Link href="/crm/settings/support">Open support and create ticket</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact support
          </CardTitle>
          <CardDescription>Phone, email, and chat options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Email:</strong> support@earlymark.ai
          </p>
          <p>
            <strong>Phone:</strong> 1300 EARLYMARK (Mon-Fri 9am-5pm AEST)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System status
          </CardTitle>
          <CardDescription>Service availability and uptime.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Internal voice and platform monitoring is active. Contact support if you need a manual status update.
          </p>
        </CardContent>
      </Card>

      <div className="pt-2 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Tracey handbook
        </h3>
        {handbookSections.map((section) => (
          <details key={section.title} className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
              <span className="font-medium text-sm">{section.title}</span>
              <span className="text-slate-500 transition-transform group-open:rotate-180">v</span>
            </summary>
            <div className="px-4 pb-4 text-sm text-muted-foreground">{section.content}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
