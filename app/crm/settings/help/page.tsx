"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, BookOpen, GraduationCap } from "lucide-react";
import { useShellStore } from "@/lib/store";
import { SupportRequestPanel } from "@/components/settings/support-request-panel";

const handbookSections: { title: string; content: React.ReactNode }[] = [
  {
    title: "What Tracey does",
    content: (
      <div className="space-y-2">
        <p>Tracey is your AI receptionist. She answers inbound calls and texts on behalf of your business, captures lead details, books jobs, and sends confirmations and follow-ups.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Handles inbound calls and texts 24/7</li>
          <li>Captures customer name, contact details, and job requirements</li>
          <li>Books jobs and sends confirmation messages automatically</li>
          <li>Follows up with leads and updates job status as work progresses</li>
          <li>Speaks as your business, not as Earlymark</li>
          <li>Also works as an internal CRM assistant through chat for your team</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Getting set up",
    content: (
      <div className="space-y-2">
        <p>Complete these settings areas so Tracey has what she needs to represent your business correctly.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Settings - My business</strong> for business details, hours, pricing, and services</li>
          <li><strong>Settings - Account</strong> for your phone setup and call handling</li>
          <li><strong>Settings - Integrations</strong> for lead capture and connected inboxes</li>
          <li><strong>Settings - AI Assistant</strong> for Tracey&apos;s operating mode and rules</li>
          <li><strong>Settings - Calls & texting</strong> for contact hours and automated messages</li>
        </ul>
      </div>
    ),
  },
  {
    title: "AI assistant modes",
    content: (
      <div className="space-y-3">
        <p>Change this any time in <strong>Settings - AI Assistant</strong>.</p>
        <div className="space-y-2">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Execution</p>
            <p>Tracey acts directly without waiting for approval.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Review &amp; approve</p>
            <p>Tracey drafts actions first and you confirm them.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Info only</p>
            <p>Tracey collects information and answers questions without making commitments.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Calls, texts, and lead capture",
    content: (
      <div className="space-y-2">
        <p>Tracey calls and texts from your Earlymark number. Configure this in <strong>Settings - Account</strong>, <strong>Calls & texting</strong>, and <strong>Integrations</strong>.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account handles your number and call forwarding</li>
          <li>Calls & texting controls when Tracey can contact customers and what messages she sends</li>
          <li>Integrations handles lead email forwarding and other lead sources</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Scheduling and routing",
    content: (
      <div className="space-y-2">
        <p>Use chat for availability checks, rescheduling, and daily planning. Tracey works within the hours you have set.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>&ldquo;What&apos;s on today?&rdquo;</li>
          <li>&ldquo;Check availability for Thursday&rdquo;</li>
          <li>&ldquo;Reschedule this job to Friday afternoon&rdquo;</li>
          <li>&ldquo;Assign this job to Jack&rdquo;</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Pricing and refusal rules",
    content: (
      <div className="space-y-2">
        <p>Use <strong>Settings - My business</strong> to set pricing ranges and list work you do not take on, so Tracey stays consistent.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add price ranges for common services</li>
          <li>Set refusal rules for work you do not want</li>
          <li>Keep quotes and responses aligned with how your business operates</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Chat commands reference",
    content: (
      <div className="space-y-2">
        <p>You can message Tracey in chat to manage customers, jobs, and communications quickly.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>&ldquo;New customer Sarah Jones needs a hot water system replaced&rdquo;</li>
          <li>&ldquo;Call John Smith&rdquo;</li>
          <li>&ldquo;Text this customer that we&apos;re running 15 minutes late&rdquo;</li>
          <li>&ldquo;Show recent leads&rdquo;</li>
          <li>&ldquo;Mark this job complete&rdquo;</li>
        </ul>
      </div>
    ),
  },
];

export default function HelpSettingsPage() {
  const router = useRouter();
  const { resetTutorial } = useShellStore();

  const handleRestartTutorial = () => {
    resetTutorial();
    router.push("/crm/dashboard");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="app-section-title">Help</h2>
        <p className="app-body-secondary mt-1">Handbook, tutorial, and support.</p>
      </div>

      <div className="pt-2 space-y-3">
        <h3 className="app-section-title flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Tracey handbook
        </h3>
        {handbookSections.map((section) => (
          <details key={section.title} className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
              <span className="font-medium text-sm">{section.title}</span>
              <span className="text-slate-500 transition-transform group-open:rotate-180">v</span>
            </summary>
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{section.content}</div>
          </details>
        ))}
      </div>

      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Guided tutorial
          </CardTitle>
          <CardDescription>Walk through the app again with the guided tutorial.</CardDescription>
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
            <Mail className="h-5 w-5" />
            Contact support
          </CardTitle>
          <CardDescription>Use email or the support request form below so the request is tracked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Email:</strong> support@earlymark.ai
          </p>
          <p>
            For urgent product issues, mark the request below as urgent and include the page, customer/job, and what you expected to happen.
          </p>
        </CardContent>
      </Card>

      <SupportRequestPanel />
    </div>
  );
}
