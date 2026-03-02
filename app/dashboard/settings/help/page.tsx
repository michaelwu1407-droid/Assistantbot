"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Phone, Activity, BookOpen } from "lucide-react";

const handbookSections = [
  {
    title: "Onboarding",
    content:
      "Setup captures business details, hours, pricing context, lead-source preferences, call routing, and inbox connection so Tracey can start handling leads immediately.",
  },
  {
    title: "AI assistant modes",
    content:
      "Execute = full autonomy, Organize = propose then confirm, Filter = reception-only. Change this in Settings -> AI Assistant.",
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
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Help</h2>
        <p className="text-muted-foreground mt-1">Support, handbook, and system status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Support and feedback
          </CardTitle>
          <CardDescription>Create and track support requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/support">Open support and create ticket</Link>
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
            A public status dashboard can be linked here when available.
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
