import Link from "next/link"
import { ArrowRight, Bot, Calendar, MessageSquare, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { Footer } from "@/components/layout/footer"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { HeroDashboardReel } from "@/components/home/hero-dashboard-reel"

const PRODUCT_PILLARS = [
  {
    icon: Bot,
    title: "One AI operator across every channel",
    description:
      "Tracey answers calls, texts, and emails like part of the business instead of another disconnected tool to monitor.",
  },
  {
    icon: Workflow,
    title: "Chat-first operations, not CRM busywork",
    description:
      "Move jobs, update records, trigger follow-up, and keep the pipeline tidy by telling Tracey what you want done.",
  },
  {
    icon: ShieldCheck,
    title: "Control stays with the business",
    description:
      "Set approval rules, choose how autonomous Tracey can be, and keep visibility over every customer interaction.",
  },
]

const PRODUCT_SECTIONS = [
  {
    eyebrow: "Customer comms",
    title: "Pick up faster and lose fewer leads",
    body:
      "Tracey handles first contact when you are driving, quoting, or on the tools. Leads get a real response immediately instead of voicemail, missed calls, or phone tag.",
    bullets: [
      "Voice, SMS, and email handled from the same operating system",
      "After-hours enquiries captured while you are unavailable",
      "Clear next steps instead of scattered replies and missed follow-up",
    ],
  },
  {
    eyebrow: "Operations",
    title: "Run the business from one clean command layer",
    body:
      "The product is built so owners can manage jobs, customer records, and follow-up without getting buried in a traditional CRM interface.",
    bullets: [
      "Update jobs and customer records through natural language",
      "Keep schedule, inbox, and pipeline aligned",
      "Reduce admin handoffs between phone, spreadsheet, and calendar",
    ],
  },
  {
    eyebrow: "Scheduling",
    title: "Keep the day moving without double handling",
    body:
      "Earlymark keeps bookings, confirmations, and customer communication tighter so the field team is not constantly fixing admin drift.",
    bullets: [
      "Calendar-aware scheduling and rescheduling flows",
      "Confirmation and follow-up paths that keep customers informed",
      "Cleaner handoff from quote to booking to completed work",
    ],
  },
  {
    eyebrow: "Visibility",
    title: "Automation where it helps, approval where it matters",
    body:
      "You decide what Tracey can do alone and what needs a human sign-off. That makes the product useful without making it reckless.",
    bullets: [
      "Execution, draft, or info-only operating modes",
      "Approval rules around quotes, commitments, and escalations",
      "A full dashboard view instead of black-box AI behavior",
    ],
  },
]

const REPLACEMENT_POINTS = [
  {
    label: "Without Earlymark",
    value: "Missed calls, manual reminders, scattered notes, and admin that keeps leaking into nights and weekends.",
  },
  {
    label: "With Earlymark",
    value: "One system for communication, scheduling, follow-up, and CRM work, with Tracey doing the repetitive parts for you.",
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Navbar />

      <main className="mx-auto flex max-w-7xl flex-col gap-20 px-6 pb-24 pt-36">
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Product
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-6xl">
              The AI receptionist and operating system for modern trade businesses
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Earlymark gives trade businesses one place to run customer communication, scheduling, follow-up, and CRM work, with Tracey handling the repetitive load.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button size="lg" variant="outline">
                  Get a demo
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {PRODUCT_PILLARS.map((pillar) => {
                const Icon = pillar.icon

                return (
                  <div key={pillar.title} className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-midnight">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-emerald-200/40 blur-3xl" />
            <HeroDashboardReel />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {PRODUCT_SECTIONS.map((section, index) => (
            <article
              key={section.title}
              className={`rounded-[32px] border border-slate-200/80 p-7 shadow-sm backdrop-blur-sm ${
                index % 2 === 0
                  ? "bg-white/90"
                  : "bg-[linear-gradient(180deg,rgba(236,253,245,0.95)_0%,rgba(255,255,255,0.96)_100%)]"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                {section.eyebrow}
              </div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-midnight">
                {section.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{section.body}</p>
              <div className="mt-6 space-y-3">
                {section.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Why it lands
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-midnight">
              Built to replace operational drag, not add another dashboard to babysit
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The product is deliberately opinionated: faster responses, less admin, cleaner scheduling, and clear control over what AI can do for the business.
            </p>
            <div className="mt-8 grid gap-4">
              {REPLACEMENT_POINTS.map((point, index) => (
                <div
                  key={point.label}
                  className={`rounded-[24px] border p-5 ${
                    index === 0
                      ? "border-slate-200 bg-slate-50"
                      : "border-emerald-200 bg-emerald-50/70"
                  }`}
                >
                  <div className="text-sm font-semibold text-midnight">{point.label}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{point.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)] p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
              Product highlights
            </div>
            <div className="mt-4 space-y-6">
              {[
                {
                  icon: MessageSquare,
                  title: "Inbox and CRM connected",
                  body: "Every conversation stays attached to the customer record instead of living in separate inboxes and phones.",
                },
                {
                  icon: Calendar,
                  title: "Scheduling that reflects real availability",
                  body: "Jobs, changes, and confirmations stay grounded in the calendar instead of living as assumptions in message threads.",
                },
                {
                  icon: ShieldCheck,
                  title: "Automation with guardrails",
                  body: "Use Tracey aggressively where speed matters, but keep approval requirements where business risk matters.",
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-lg font-semibold">{item.title}</div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/78">{item.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200/80 bg-white/90 px-8 py-10 text-center shadow-sm backdrop-blur-sm md:px-14">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Ready to see it live?
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-midnight md:text-5xl">
              Put Tracey to work before your next missed call becomes someone else&apos;s job
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
              Start with your own workflow, your own rules, and a setup that actually reflects how the business runs.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button size="lg" variant="outline">
                  Get a demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
