"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Phone, Activity, BookOpen, GraduationCap } from "lucide-react";
import { useShellStore } from "@/lib/store";
import { SupportRequestPanel } from "@/components/settings/support-request-panel";

const handbookSections: { title: string; content: React.ReactNode }[] = [
  {
    title: "What Tracey does",
    content: (
      <div className="space-y-2">
        <p>Tracey is your AI receptionist — she answers inbound calls and texts on behalf of your business, captures lead details, books jobs, and sends confirmations and follow-ups.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Handles inbound calls and texts 24/7, never misses an inquiry</li>
          <li>Captures customer name, contact details, and job requirements</li>
          <li>Books jobs and sends confirmation messages automatically</li>
          <li>Follows up with leads and updates job status as work progresses</li>
          <li>Identifies as working for your business — customers never hear &ldquo;Earlymark&rdquo;</li>
          <li>Also works as an internal CRM assistant via the chat interface for your team</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Getting set up",
    content: (
      <div className="space-y-2">
        <p>Complete each of these settings areas so Tracey has everything she needs to represent your business correctly.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Settings → My business</strong> — business name, services offered, working hours, and pricing context</li>
          <li><strong>Settings → Account → Phone number</strong> — set up your Earlymark number and configure call forwarding from your existing number</li>
          <li><strong>Settings → Integrations</strong> — connect inbox sources (email, web form, Facebook, etc.) for automatic lead capture</li>
          <li><strong>Settings → AI Assistant</strong> — choose Tracey&apos;s operating mode (see AI assistant modes below)</li>
          <li><strong>Settings → Calls & texting</strong> — set customer contact hours and urgent-call routing</li>
        </ul>
        <p className="pt-1">Tracey can start handling leads as soon as your phone number and business profile are configured.</p>
      </div>
    ),
  },
  {
    title: "AI assistant modes",
    content: (
      <div className="space-y-3">
        <p>Tracey&apos;s mode controls how much she does independently versus waiting for your approval. Change it any time in <strong>Settings → AI Assistant</strong>.</p>
        <div className="space-y-2">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Execute</p>
            <p>Tracey acts directly — sends texts, books jobs, and updates records without waiting for your approval. Best once you&apos;re confident in how Tracey handles your business.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Review &amp; approve</p>
            <p>Tracey drafts every outgoing action and shows you a preview card. You tap <em>Approve</em> or <em>Edit</em> before anything is sent or saved. Good for getting started or for high-stakes jobs.</p>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Info only</p>
            <p>Tracey captures details and answers questions but never books, texts, or makes any commitment on your behalf. You handle all follow-up manually. Useful if you want Tracey as a note-taker only.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Note: these modes apply to Tracey&apos;s customer-facing actions (calls and texts). The internal CRM chat assistant is not restricted by this setting.</p>
      </div>
    ),
  },
  {
    title: "Calls and texts",
    content: (
      <div className="space-y-2">
        <p>Tracey calls and texts from your Earlymark number. Configure how and when she contacts customers in <strong>Settings → Calls & texting</strong>.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Customer contact hours</strong> — the window Tracey is allowed to call or text customers (e.g. Mon–Fri 8am–6pm). Outside this window she queues messages for the next available slot.</li>
          <li><strong>Urgent call routing</strong> — set a fallback number so Tracey can transfer hot inbound calls straight to you when needed.</li>
          <li><strong>Inbound calls</strong> — with forwarding configured, Tracey answers before calls reach your personal phone. She introduces herself by your business name.</li>
          <li><strong>Automated messages</strong> — confirmation texts, follow-up reminders, and booking confirmations fire automatically based on job stage.</li>
          <li><strong>Lead follow-up</strong> — in Execute or Review &amp; approve mode, Tracey texts a new lead within minutes of receiving their inquiry.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Lead capture and integrations",
    content: (
      <div className="space-y-2">
        <p>Connect your existing lead sources in <strong>Settings → Integrations</strong> so Tracey can pick up new inquiries automatically.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Supported sources include email inbox, website contact form, and Facebook lead ads</li>
          <li>When a lead arrives, Tracey parses the details, creates a customer record, and opens a job draft</li>
          <li>In Execute or Review &amp; approve mode, Tracey texts the lead to confirm details and book a time</li>
          <li>All captured leads appear in the CRM under <strong>Customers</strong> and are linked to their source</li>
        </ul>
        <p className="pt-1">You can also create leads manually by messaging Tracey in the chat: <em>&ldquo;New customer Sarah Jones — needs a hot water system replaced.&rdquo;</em></p>
      </div>
    ),
  },
  {
    title: "Scheduling and routing",
    content: (
      <div className="space-y-2">
        <p>Tracey schedules jobs within your configured working window and routes them to available team members.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Working window set in <strong>Settings → My business → Working hours</strong></li>
          <li>Jobs are assigned based on team member availability and role</li>
          <li>You can override any scheduled job directly from the job card</li>
        </ul>
        <p className="pt-1 font-medium text-slate-700 dark:text-slate-300">Useful chat commands:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><em>&ldquo;What&apos;s on today / tomorrow / this week&rdquo;</em> — shows the day&apos;s scheduled jobs</li>
          <li><em>&ldquo;Check availability for Thursday&rdquo;</em> — shows open slots</li>
          <li><em>&ldquo;Reschedule job #123 to Friday afternoon&rdquo;</em> — moves a job</li>
          <li><em>&ldquo;Assign [job] to [team member]&rdquo;</em> — routes a job manually</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Pricing and refusal rules",
    content: (
      <div className="space-y-2">
        <p>Set your pricing and declined services in <strong>Settings → My business</strong> so Tracey quotes consistently and doesn&apos;t commit to work you can&apos;t do.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add price ranges for your common services (e.g. &ldquo;Hot water system: $800–$1,400&rdquo;, &ldquo;Hourly rate: $110–$140/hr&rdquo;)</li>
          <li>Tracey quotes within these ranges — never above or below</li>
          <li>Refusal rules tell Tracey which requests to decline: she politely explains she can&apos;t help and redirects the customer</li>
        </ul>
        <p className="pt-1 font-medium text-slate-700 dark:text-slate-300">Example refusal rules:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>&ldquo;No same-day bookings&rdquo;</li>
          <li>&ldquo;No asbestos or hazmat work&rdquo;</li>
          <li>&ldquo;No jobs under $150&rdquo;</li>
          <li>&ldquo;Residential only — no commercial&rdquo;</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Chat commands reference",
    content: (
      <div className="space-y-2">
        <p>Message Tracey in the chat interface to manage customers, jobs, and communications quickly.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><em>&ldquo;New customer [name] — [job type]&rdquo;</em> — creates a customer and job draft</li>
          <li><em>&ldquo;Call [customer name]&rdquo;</em> — triggers an outbound call</li>
          <li><em>&ldquo;Text [customer]: [message]&rdquo;</em> — sends an SMS</li>
          <li><em>&ldquo;Show recent leads&rdquo;</em> — lists uncontacted inbound leads</li>
          <li><em>&ldquo;What&apos;s on today / tomorrow / this week&rdquo;</em> — shows scheduled jobs</li>
          <li><em>&ldquo;Check availability for [date]&rdquo;</em> — shows open slots</li>
          <li><em>&ldquo;Reschedule [job] to [day/time]&rdquo;</em> — moves a job</li>
          <li><em>&ldquo;Mark [job] complete&rdquo;</em> — updates job status</li>
          <li><em>&ldquo;Show jobs for [customer]&rdquo;</em> — pulls up a customer&apos;s job history</li>
          <li><em>&ldquo;Add note to [customer]: [note]&rdquo;</em> — saves a note on a customer record</li>
        </ul>
        <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">You can phrase commands naturally — Tracey understands context and will ask for clarification if anything is ambiguous.</p>
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
            <Link href="#support-request">Open support form</Link>
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
        </CardContent>
      </Card>

      <SupportRequestPanel />

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
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{section.content}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
