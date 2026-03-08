import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

const SOLUTIONS = [
  {
    slug: "electricians",
    title: "For Electricians",
    description: "Book urgent callouts, keep crews assigned, and stop losing jobs after hours.",
  },
  {
    slug: "plumbers",
    title: "For Plumbers",
    description: "Handle burst-pipe urgency, quote faster, and keep customers updated automatically.",
  },
  {
    slug: "landscapers",
    title: "For Landscapers",
    description: "Coordinate site visits, seasonal jobs, and recurring maintenance without admin drag.",
  },
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-36">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Solutions</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-6xl">
            Earlymark for trade businesses that need less admin and more booked jobs.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Pick the version that matches how your business works. Each page focuses on the problems, workflows, and customer expectations of that trade.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {SOLUTIONS.map((solution) => (
            <article key={solution.slug} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-midnight">{solution.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{solution.description}</p>
              <Link href={`/solutions/${solution.slug}`} className="mt-6 inline-flex">
                <Button variant="mint">View solution</Button>
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
