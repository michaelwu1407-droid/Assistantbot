import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Phone, MessageSquare, CheckCircle2, Plus,
  Zap, Wrench, Trees, Sparkles, Bug, Key, Paintbrush, Thermometer,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { TRADE_SERVICES, TRADE_SERVICES_BY_SLUG } from "@/lib/trade-services";

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

type RouteParams = {
  slug: string;
};

export function generateStaticParams() {
  return TRADE_SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = TRADE_SERVICES_BY_SLUG[slug as keyof typeof TRADE_SERVICES_BY_SLUG];
  if (!solution) return {};
  return {
    title: solution.seoTitle,
    description: solution.seoDescription,
  };
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const solution = TRADE_SERVICES_BY_SLUG[slug as keyof typeof TRADE_SERVICES_BY_SLUG];

  if (!solution) notFound();

  const jobTypes = solution.heroDetail.split(" · ").map((s) => s.trim());
  const TradeIcon = TRADE_ICONS[solution.slug] ?? Sparkles;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="flex flex-col">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0f172a_0%,#0d3b2a_55%,#065f46_100%)] px-6 pt-36 pb-20 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "radial-gradient(50% 40% at 80% 0%, rgba(16,185,129,0.30) 0%, rgba(16,185,129,0) 70%)" }} />
          <div className="relative mx-auto max-w-4xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                <TradeIcon className="h-5 w-5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
                {solution.eyebrow}
              </p>
            </div>
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] leading-tight md:text-6xl text-balance">
              {solution.title}
            </h1>
            <p className="text-lg leading-8 text-white/80 max-w-2xl">
              {solution.summary}
            </p>

            {/* Job type pills */}
            <div className="flex flex-wrap gap-2">
              {jobTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
                >
                  {type}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/auth">
                <Button variant="mint" size="lg">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button size="lg" variant="ghost" className="border-white/30 text-white hover:bg-white/10">
                  Get a demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3 outcomes ── */}
        <section className="border-b border-slate-200 bg-[#F8FAFC] px-6 py-10">
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Phone, label: "Every call answered", desc: "Tracey picks up 24/7 so no lead goes to voicemail." },
              { icon: MessageSquare, label: "CRM runs on chat", desc: "Tell Tracey what to do. She updates your pipeline instantly." },
              { icon: CheckCircle2, label: "Every follow-up sent", desc: "Quotes, payments, reviews — Tracey chases them all." },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[18px] bg-[#E0FAF2] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-midnight">{label}</p>
                </div>
                <p className="text-sm text-slate-600 leading-6">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Workflows ── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl flex flex-col gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-midnight md:text-4xl">
                What Tracey handles for {solution.navLabel.toLowerCase()}
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {solution.workflows.map((workflow, index) => (
                <article
                  key={workflow.title}
                  className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-lg font-bold tracking-[-0.02em] text-midnight">
                      {workflow.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    {workflow.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-slate-200 bg-[#F8FAFC] px-6 py-20">
          <div className="mx-auto max-w-3xl flex flex-col gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                FAQ
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-midnight">
                Common questions from {solution.navLabel.toLowerCase()}
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {solution.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all open:border-emerald-200 open:bg-emerald-50/40 open:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-semibold text-midnight">{faq.question}</span>
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all group-open:rotate-45 group-open:bg-emerald-600 group-open:text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <div className="border-t border-emerald-100/60 px-6 pb-6 pt-4 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)] px-6 py-20 text-white">
          <div className="mx-auto max-w-4xl flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
                Ready to try it for your {solution.navLabel.toLowerCase()} business?
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                No contracts. No complexity. Tracey can be answering your calls today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link href="/solutions">
                <Button variant="ghost" className="border-white/30 text-white hover:bg-white/10">
                  Back to Trade services
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="mint">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
