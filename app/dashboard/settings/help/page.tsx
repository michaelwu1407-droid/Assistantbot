"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Bot, MessageSquare, Calendar, DollarSign, Users, Zap, Send, FileText, Radio, Headphones, Mail } from "lucide-react";

export default function TravisHandbookPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-emerald-600" />
          Travis Handbook
        </h2>
        <p className="text-muted-foreground mt-1">
          Your guide to Earlymark and the Travis AI assistant. Everything in one place.
        </p>
      </div>

      {/* 1. Agent Modes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-emerald-600" />
            Agent Modes
          </CardTitle>
          <CardDescription>
            Control how autonomous Travis is. Set this in Settings → Agent Capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Execute</p>
            <p className="text-muted-foreground">
              Full autonomy. Travis schedules, prices, and creates jobs independently. Best when you trust the AI to act on your behalf.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Organize</p>
            <p className="text-muted-foreground">
              Travis proposes, you approve. Draft cards appear for confirmation before anything is created or sent. Recommended for most users.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Filter</p>
            <p className="text-muted-foreground">
              Screening only. Travis collects info and suggests next steps but does not schedule, price, or send messages without your say-so.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Top Common Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-amber-500" />
            Top Common Commands
          </CardTitle>
          <CardDescription>
            Try these in the chat to get the most out of Travis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;What&apos;s on today?&quot;</span> — Daily summary and first job setup</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;Create a new test job&quot;</span> — Add a job via chat</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;New repair job for [name] at [address] for $[amount] tomorrow 2pm&quot;</span> — Create and schedule in one go</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;Show me my pipeline&quot;</span> — See all jobs by stage</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;What&apos;s my schedule?&quot;</span> — View your calendar</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;Give me my daily summary&quot;</span> — Jobs, revenue, overdue tasks</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;Show my recent messages&quot;</span> — Inbox overview</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;From now on always add 1 hour buffer between jobs&quot;</span> — Save a preference</li>
            <li><span className="font-medium text-slate-900 dark:text-white">&quot;feedback&quot;</span> — Send product feedback to the team</li>
          </ul>
        </CardContent>
      </Card>

      {/* 3. Communications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Communications
          </CardTitle>
          <CardDescription>
            Inbox, SMS, email, and AI voice in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>See conversations with each customer across emails, texts, and calls. Travis can send automated messages, initiate outbound calls, and answer calls in different languages. Use the Inbox from the sidebar or ask Travis to message or call a customer.</p>
        </CardContent>
      </Card>

      {/* 3b. Outbound & Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-emerald-600" />
            Outbound &amp; Leads
          </CardTitle>
          <CardDescription>
            Handle leads from hipages, Google Ads, Airtasker, and your own outbound.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>In the Inbox, use the Leads / Existing toggle to switch between new leads (not yet converted) and existing customers who have jobs or are further down the pipeline. Respond to leads from any source in one place; Travis can message or call them.</p>
        </CardContent>
      </Card>

      {/* 3c. AI Receptionist & Call Forwarding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-emerald-600" />
            AI Receptionist &amp; Call Forwarding
          </CardTitle>
          <CardDescription>
            Forward your phone to Travis so you never miss a job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>In Settings → Phone you can forward incoming calls (e.g. from Google Ads, hipages, or your main line) to Travis. Use &quot;Enable 100% AI Receptionist&quot; to send every call to Travis, or &quot;Backup AI Receptionist&quot; so he only picks up if you don&apos;t answer. If a caller asks to speak to you, Travis can transfer them to your mobile.</p>
        </CardContent>
      </Card>

      {/* 3d. Email Lead Capture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-emerald-600" />
            Email Lead Capture &amp; Auto-Response
          </CardTitle>
          <CardDescription>
            Forward &quot;Lead Won&quot; emails to your unique address; we create the contact and can call the lead instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>In Settings → Integrations, use the Auto-Lead Response card. You get a unique forwarding email (e.g. you@inbound.earlymark.ai). Set up a Gmail filter to forward Lead Won emails from HiPages, Airtasker, or ServiceSeeking to that address. We create the contact and deal, parse the lead&apos;s phone and name, and—if you turn on &quot;Call new leads immediately?&quot;—trigger an immediate AI call to lock down the job.</p>
        </CardContent>
      </Card>

      {/* 4. Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Scheduling &amp; Routing
          </CardTitle>
          <CardDescription>
            Reschedule, block time, running late, and route optimization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Ask &quot;Am I free Tuesday afternoon?&quot;, &quot;Reschedule Wendy to Friday 10am&quot;, &quot;Block Wednesday morning for van service&quot;, or &quot;Running 30 mins late&quot; to notify affected clients. Use &quot;Plan my route for tomorrow&quot; for optimal job order.
          </p>
        </CardContent>
      </Card>

      {/* 5. Pricing &amp; Quoting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Pricing &amp; Quoting
          </CardTitle>
          <CardDescription>
            Call-out fee, price ranges, and AI-generated quotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Set your call-out fee and typical price ranges in Settings. Then ask Travis to &quot;Quote blocked drain for Mary&quot; or &quot;What&apos;s $1,250 plus GST?&quot; for quick calculations.
          </p>
        </CardContent>
      </Card>

      {/* 6. CRM &amp; Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-slate-600" />
            CRM &amp; Contacts
          </CardTitle>
          <CardDescription>
            Contacts are auto-saved; search and filter from the Contacts page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Ask &quot;How many contacts do I have?&quot;, &quot;Who&apos;s due for annual service?&quot;, or &quot;Find Thom&quot; for fuzzy search. When creating customers or logging deals, at least one of phone or email is required.</p>
        </CardContent>
      </Card>

      {/* 7. Soft Chase (Lead Follow-up) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-emerald-600" />
            Soft Chase (Lead Follow-up)
          </CardTitle>
          <CardDescription>
            A default follow-up message for new leads not yet converted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>In Settings → Agent Capabilities you can configure the follow-up message and when it is sent (e.g. 3 days or 1 day after the lead). Travis sends this as either an email or text so you never leave a lead cold.</p>
        </CardContent>
      </Card>

      {/* 8. Unpaid Invoice Follow-up */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-emerald-600" />
            Unpaid Invoice Follow-up
          </CardTitle>
          <CardDescription>
            Automatic follow-up for unpaid invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>In Settings → Agent Capabilities you can set a default message and trigger (e.g. 7 days after invoice) for following up on unpaid invoices. Travis sends this by email or text to help you get paid faster.</p>
        </CardContent>
      </Card>
    </div>
  );
}
