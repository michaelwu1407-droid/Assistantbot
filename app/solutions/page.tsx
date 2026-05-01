import Link from "next/link";
import {
  ArrowRight, Phone, MessageSquare, CheckCircle2,
  Zap, Wrench, Trees, Sparkles, Bug, Key, Paintbrush, Thermometer,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { TRADE_SERVICES, TRADE_SERVICES_SUMMARY } from "@/lib/trade-services";

const TRADE_ICONS: Record<string, typeof Zap> = {
  electricians: Zap,
  plumbers: Wrench,
  landscapers: Trees,
  cleaners: Sparkles,
  "pest-control": Bug,
  locksmiths: Key,
  painters: Paintbrush,
  hvac: Thermometer,
};

export const metadata = {
  title: "Solutions | Earlymark",
  description:
    "Explore trade-specific Earlymark workflows for electricians, plumbers, landscapers, cleaners, pest control, locksmiths, painters, and HVAC businesses.",
};

const INCLUDED = [
  { icon: Phone, label: "Every call answered 24/7" },
  { icon: MessageSquare, label: "CRM runs on plain English chat" },
  { icon: CheckCircle2, label: "Every follow-up sent automatically" },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-20 px-6 pb-24 pt-36">

        {/* Hero */}
        <section className="flex flex-col items-center gap-8 text-center">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {TRADE_SERVICES_SUMMARY.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-6xl">
              {TRADE_SERVICES_SUMMARY.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              {TRADE_SERVICES_SUMMARY.description}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
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

          {/* What's included in every solution */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 pt-2">
            {INCLUDED.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Trade cards */}
        <section className="flex flex-col gap-6">
          {TRADE_SERVICES.map((service, index) => {
            const reverse = index % 2 === 1;
            const Icon = TRADE_ICONS[service.slug] ?? Sparkles;
            return (
              <article
                key={service.slug}
                className="grid gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] md:grid-cols-[1.1fr_1fr]"
              >
                {/* Text side */}
                <div className={`flex flex-col justify-center gap-5 p-8 md:p-10 ${reverse ? "md:order-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                      {service.summaryTitle}
                    </p>
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-midnight md:text-3xl">
                    {service.summaryTeaser}
                  </h2>
                  <p className="text-base leading-7 text-slate-600">
                    {service.summaryAngle}
                  </p>
                  <div>
                    <Link href={`/solutions/${service.slug}`}>
                      <Button variant="outline">
                        How it works for {service.navLabel.toLowerCase()}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Visual side — dark green panel with workflow list */}
                <div className={`relative flex flex-col justify-center gap-5 bg-[linear-gradient(155deg,#0f172a_0%,#0d3b2a_55%,#065f46_100%)] p-8 md:p-10 ${reverse ? "md:order-1" : ""}`}>
                  <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "radial-gradient(60% 50% at 80% 0%, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 70%)" }} />
                  <p className="relative text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                    What Tracey handles
                  </p>
                  <ul className="relative flex flex-col gap-3">
                    {service.workflows.slice(0, 3).map((workflow) => (
                      <li
                        key={workflow.title}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-white">{workflow.title}</span>
                          <span className="text-xs leading-5 text-white/65 line-clamp-2">{workflow.body}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </section>

        {/* Bottom CTA */}
        <section className="rounded-[18px] bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)] p-10 text-white text-center flex flex-col items-center gap-6">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
            Give yourself an early mark today
          </h2>
          <p className="text-white/70 max-w-lg leading-7">
            No contracts. No complexity. Try Tracey free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth">
              <Button size="lg" variant="mint">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact#contact-form">
              <Button size="lg" variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                Get a demo
              </Button>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
