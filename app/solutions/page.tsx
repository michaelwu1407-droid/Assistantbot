import Link from "next/link";
import {
  ArrowRight, Phone, MessageSquare, CheckCircle2,
  Zap, Wrench, Trees, Sparkles, Bug, Key, Paintbrush, Thermometer,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { MastheadHero } from "@/components/marketing/masthead-hero";
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
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />
      <main>

        {/* Hero */}
        <MastheadHero
          index="§ Solutions"
          kicker={TRADE_SERVICES_SUMMARY.eyebrow}
          title={TRADE_SERVICES_SUMMARY.title}
          lead={TRADE_SERVICES_SUMMARY.description}
          actions={<>
            <Link href="/auth"><Button size="lg" variant="mint">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link href="/contact#contact-form"><Button size="lg" variant="outline">Get a demo</Button></Link>
          </>}
        />

        <div className="mx-auto flex max-w-[1320px] flex-col gap-20 px-5 sm:px-8 pb-24 pt-16 md:pt-24">

        {/* What's included in every solution */}
        <div className="flex flex-col gap-4 border-t border-hair pt-4 sm:flex-row sm:items-center sm:gap-10">
          <span className="em-kicker text-forest shrink-0">In every solution</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
            {INCLUDED.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-ink2">
                <Icon className="h-4 w-4 text-forest shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade cards */}
        <section className="flex flex-col gap-6">
          {TRADE_SERVICES.map((service, index) => {
            const reverse = index % 2 === 1;
            const Icon = TRADE_ICONS[service.slug] ?? Sparkles;
            return (
              <article
                key={service.slug}
                className="grid gap-0 overflow-hidden rounded-md border border-hair bg-card shadow-[0_8px_30px_-18px_rgba(14,31,26,0.18)] transition-shadow hover:shadow-[0_14px_44px_-18px_rgba(14,31,26,0.28)] md:grid-cols-[1.1fr_1fr]"
              >
                {/* Text side */}
                <div className={`flex flex-col justify-center gap-5 p-8 md:p-10 ${reverse ? "md:order-2" : ""}`}>
                  <div className="flex items-center justify-between gap-3 border-b border-hair pb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-subtle text-forest">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="em-kicker text-ink2/45">{String(index + 1).padStart(2, "0")} / {String(TRADE_SERVICES.length).padStart(2, "0")}</span>
                  </div>
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] md:text-3xl text-ink">
                    {service.summaryTeaser}
                  </h2>
                  <p className="text-base leading-7 text-ink2">
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
                <div className={`relative flex flex-col justify-center gap-5 bg-[linear-gradient(155deg,#0E2F28_0%,#16433A_55%,#1E5447_100%)] p-8 md:p-10 ${reverse ? "md:order-1" : ""}`}>
                  <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "radial-gradient(60% 50% at 80% 0%, rgba(0,210,139,0.22) 0%, rgba(0,210,139,0) 70%)" }} />
                  <ul className="relative flex flex-col gap-3">
                    {service.workflows.slice(0, 3).map((workflow) => (
                      <li
                        key={workflow.title}
                        className="flex items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-500" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-paper">{workflow.title}</span>
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
        <section className="relative overflow-hidden rounded-md bg-forest p-10 md:p-14 text-paper text-center flex flex-col items-center gap-6">
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(70% 60% at 50% 120%, rgba(0,210,139,0.18) 0%, transparent 70%)" }} />
          <h2 className="relative font-display text-3xl font-semibold tracking-[-0.01em] md:text-4xl">
            Give yourself an <span className="italic text-mint-500">early mark</span> today
          </h2>
          <p className="relative text-paper/65 max-w-lg leading-7">
            No contracts. No complexity. Try Tracey free.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth">
              <Button size="lg" variant="mint">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact#contact-form">
              <Button size="lg" variant="ghost" className="text-paper border border-white/25 hover:bg-white/10 hover:text-white">
                Get a demo
              </Button>
            </Link>
          </div>
        </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
