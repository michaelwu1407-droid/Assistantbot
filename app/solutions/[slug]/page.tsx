import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { TRADE_SERVICES, TRADE_SERVICES_BY_SLUG } from "@/lib/trade-services";

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

  if (!solution) {
    return {};
  }

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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-36">
        <section className="rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-8 shadow-sm md:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              {solution.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-6xl">
              {solution.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              {solution.summary}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              {solution.heroDetail}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth">
                <Button variant="mint">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button variant="outline">Get a demo</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {solution.workflows.map((workflow, index) => (
            <article
              key={workflow.title}
              className={`rounded-[28px] border p-7 shadow-sm ${
                index % 2 === 0
                  ? "border-emerald-100 bg-emerald-50/60"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Workflow {index + 1}
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-midnight">
                {workflow.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {workflow.body}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-slate-50 p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-midnight">
              Common questions from {solution.navLabel.toLowerCase()}
            </h2>
          </div>
          <div className="mt-6 grid gap-4">
            {solution.faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-midnight">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)] p-8 text-white">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
              Trade services
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.03em]">
              See how Earlymark fits your trade workflow.
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Start with a trade-specific version of Earlymark and give customers a workflow
              that fits how your jobs actually run.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/solutions">
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                Back to Trade services
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="mint">Get started</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
