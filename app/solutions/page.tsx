import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { HeroDashboardReel } from "@/components/home/hero-dashboard-reel";
import { TRADE_SERVICES, TRADE_SERVICES_SUMMARY } from "@/lib/trade-services";

export const metadata = {
  title: "Trade services | Earlymark",
  description:
    "Explore trade-specific Earlymark workflows for electricians, plumbers, landscapers, cleaners, pest control, locksmiths, painters, and HVAC businesses.",
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-16 px-6 pb-24 pt-36">
        <section className="flex flex-col gap-8">
          <div className="mx-auto max-w-3xl text-center">
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

          <HeroDashboardReel />
        </section>

        <section className="flex flex-col gap-8">
          {TRADE_SERVICES.map((service, index) => {
            const reverse = index % 2 === 1;
            return (
              <article
                key={service.slug}
                className="grid gap-6 rounded-[32px] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm md:grid-cols-2 md:p-8"
              >
                <div className={reverse ? "md:order-2" : ""}>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    {service.summaryTitle}
                  </div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-midnight">
                    {service.summaryTeaser}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {service.summaryAngle}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/solutions/${service.slug}`}>
                      <Button variant="outline">
                        View {service.navLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div
                  className={`rounded-[28px] border border-white/70 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] ${
                    reverse ? "md:order-1" : ""
                  } ${
                    index % 4 === 0
                      ? "bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)]"
                      : index % 4 === 1
                        ? "bg-[linear-gradient(135deg,#172554_0%,#0369a1_100%)]"
                        : index % 4 === 2
                          ? "bg-[linear-gradient(135deg,#111827_0%,#7c3aed_100%)]"
                          : "bg-[linear-gradient(135deg,#1f2937_0%,#b45309_100%)]"
                  }`}
                >
                  <div className="flex h-full flex-col justify-between gap-8">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                        Trade services
                      </div>
                      <div className="mt-3 max-w-sm text-2xl font-bold leading-tight">
                        {service.navLabel} workflows built for how jobs actually move.
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {service.workflows.slice(0, 2).map((workflow) => (
                        <div
                          key={workflow.title}
                          className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
                        >
                          <div className="text-sm font-semibold text-white">
                            {workflow.title}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-white/75">
                            {workflow.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
