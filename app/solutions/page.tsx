import Link from "next/link";
import { ArrowRight, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { TRADE_SERVICES, TRADE_SERVICES_SUMMARY } from "@/lib/trade-services";

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
        <section className="flex flex-col gap-8">
          {TRADE_SERVICES.map((service, index) => {
            const reverse = index % 2 === 1;
            return (
              <article
                key={service.slug}
                className="grid gap-0 rounded-[18px] border border-slate-200/80 bg-white shadow-sm overflow-hidden md:grid-cols-2"
              >
                {/* Text side */}
                <div className={`flex flex-col justify-center gap-5 p-8 md:p-10 ${reverse ? "md:order-2" : ""}`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                      {service.summaryTitle}
                    </p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-midnight md:text-3xl">
                      {service.summaryTeaser}
                    </h2>
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      {service.summaryAngle}
                    </p>
                  </div>
                  <div>
                    <Link href={`/solutions/${service.slug}`}>
                      <Button variant="outline">
                        How it works for {service.navLabel.toLowerCase()}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Visual side — mint-tinted panel with workflow cards */}
                <div className={`bg-[#E0FAF2] p-8 md:p-10 flex flex-col justify-center gap-4 ${reverse ? "md:order-1" : ""}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">
                    What Tracey handles
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {service.workflows.slice(0, 2).map((workflow) => (
                      <div
                        key={workflow.title}
                        className="rounded-[18px] border border-primary/15 bg-white/80 p-4"
                      >
                        <p className="text-sm font-semibold text-midnight">
                          {workflow.title}
                        </p>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">
                          {workflow.body}
                        </p>
                      </div>
                    ))}
                  </div>
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
