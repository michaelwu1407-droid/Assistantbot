import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Bot, MessageSquare, Calendar, DollarSign, Users, Zap, Send, FileText, Radio, Headphones, Mail } from "lucide-react"

export const metadata = {
  title: "Tutorial | Travis Handbook – Earlymark",
  description: "Learn how to use Earlymark and Travis AI: agent modes, commands, communications, scheduling, and follow-up skills.",
}

const SECTIONS = [
  {
    id: "agent-modes",
    icon: Bot,
    title: "Agent Modes",
    description: "Control how autonomous Travis is. Set this in Settings → Agent Capabilities.",
    content: [
      { name: "Execute", body: "Full autonomy. Travis schedules, prices, and creates jobs independently. Best when you trust the AI to act on your behalf." },
      { name: "Organize", body: "Travis proposes, you approve. Draft cards appear for confirmation before anything is created or sent. Recommended for most users." },
      { name: "Filter", body: "Screening only. Travis collects info and suggests next steps but does not schedule, price, or send messages without your say-so." },
    ],
  },
  {
    id: "commands",
    icon: Zap,
    title: "Top Common Commands",
    description: "Try these in the chat to get the most out of Travis.",
    list: [
      { cmd: "What's on today?", desc: "Daily summary and first job setup" },
      { cmd: "Create a new test job", desc: "Add a job via chat" },
      { cmd: "New repair job for [name] at [address] for $[amount] tomorrow 2pm", desc: "Create and schedule in one go" },
      { cmd: "Show me my pipeline", desc: "See all jobs by stage" },
      { cmd: "What's my schedule?", desc: "View your calendar" },
      { cmd: "Give me my daily summary", desc: "Jobs, revenue, overdue tasks" },
      { cmd: "Show my recent messages", desc: "Inbox overview" },
      { cmd: "feedback", desc: "Send product feedback to the team" },
    ],
  },
  {
    id: "communications",
    icon: MessageSquare,
    title: "Communications",
    description: "Inbox, SMS, email, and AI voice in one place.",
    body: "See conversations with each customer across emails, texts, and calls. Travis can send automated messages, initiate outbound calls, and answer calls in different languages. Use the Inbox from the sidebar or ask Travis to message or call a customer.",
  },
  {
    id: "outbound-leads",
    icon: Radio,
    title: "Outbound & Leads",
    description: "Handle leads from hipages, Google Ads, Airtasker, and your own outbound.",
    body: "Leads that haven't converted yet (no job scheduled) appear in the Inbox under \"Leads\". Use the Leads / Existing toggle to switch between new leads and existing customers who already have jobs or are further down the pipeline. Respond to leads from any source in one place — Travis can message or call them, and you can reply from the Inbox.",
  },
  {
    id: "ai-receptionist",
    icon: Headphones,
    title: "AI Receptionist & Call Forwarding",
    description: "Forward your phone to Travis so you never miss a job.",
    body: "In Settings → Phone you can forward incoming calls (e.g. from Google Ads, hipages, or your main line) to Travis. Use \"Enable 100% AI Receptionist\" to send every call to Travis, or \"Backup AI Receptionist\" so he only picks up if you don't answer. If a caller asks to speak to you, Travis can transfer them to your mobile.",
  },
  {
    id: "email-lead-capture",
    icon: Mail,
    title: "Email Lead Capture & Auto-Response",
    description: "Forward \"Lead Won\" emails to Travis and optionally call the lead instantly.",
    body: "In Settings → Integrations, use the Auto-Lead Response card. You get a unique forwarding address (e.g. you@inbound.earlymark.ai). Set up a Gmail filter to forward \"Lead Won\" emails from HiPages, Airtasker, or ServiceSeeking to that address. We create the contact and deal, parse the lead's phone and name, and—if you turn it on—trigger an immediate Retell AI call to lock down the job.",
  },
  {
    id: "scheduling",
    icon: Calendar,
    title: "Scheduling & Routing",
    description: "Reschedule, block time, running late, and route optimization.",
    body: "Ask \"Am I free Tuesday afternoon?\", \"Reschedule Wendy to Friday 10am\", \"Block Wednesday morning for van service\", or \"Running 30 mins late\" to notify affected clients. Use \"Plan my route for tomorrow\" for optimal job order.",
  },
  {
    id: "pricing",
    icon: DollarSign,
    title: "Pricing & Quoting",
    description: "Call-out fee, price ranges, and AI-generated quotes.",
    body: "Set your call-out fee and typical price ranges in Settings. Then ask Travis to \"Quote blocked drain for Mary\" or \"What's $1,250 plus GST?\" for quick calculations.",
  },
  {
    id: "crm",
    icon: Users,
    title: "CRM & Contacts",
    description: "Contacts are auto-saved; search and filter from the Contacts page.",
    body: "Ask \"How many contacts do I have?\", \"Who's due for annual service?\", or \"Find Thom\" for fuzzy search. When creating customers or deals, at least one of phone or email is required.",
  },
  {
    id: "soft-chase",
    icon: Send,
    title: "Soft Chase (Lead Follow-up)",
    description: "A default follow-up message for new leads not yet converted.",
    body: "In Settings → Agent Capabilities you can configure the follow-up message and when it is sent (e.g. 3 days or 1 day after the lead). Travis sends this as either an email or text so you never leave a lead cold.",
  },
  {
    id: "invoice-follow-up",
    icon: FileText,
    title: "Unpaid Invoice Follow-up",
    description: "Automatic follow-up for unpaid invoices.",
    body: "In Settings → Agent Capabilities you can set a default message and trigger (e.g. 7 days after invoice) for following up on unpaid invoices. Travis sends this by email or text to help you get paid faster.",
  },
]

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center flex flex-col gap-4 mb-12">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-midnight">
              Travis Handbook
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Your guide to Earlymark and the Travis AI assistant. Everything in one place.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {SECTIONS.map((s) => {
                const Icon = s.icon
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.title}
                  </a>
                )
              })}
            </div>
          </div>

          <div className="space-y-8">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <Card key={section.id} id={section.id} className="scroll-mt-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-emerald-600" />
                      {section.title}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {"content" in section && section.content && (
                      <div className="space-y-4">
                        {section.content.map((item) => (
                          <div key={item.name}>
                            <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-muted-foreground">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {"list" in section && section.list && (
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                        {section.list.map((item) => (
                          <li key={item.cmd}>
                            <span className="font-medium text-slate-900 dark:text-white">&quot;{item.cmd}&quot;</span>
                            {" — "}
                            {item.desc}
                          </li>
                        ))}
                      </ul>
                    )}
                    {"body" in section && section.body && (
                      <p className="text-muted-foreground">{section.body}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-14 text-center">
            <Link href="/auth">
              <Button size="lg">
                Get started with Earlymark
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
