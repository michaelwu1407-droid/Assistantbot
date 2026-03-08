import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

const SOLUTIONS: Record<string, {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
}> = {
  electricians: {
    eyebrow: "Solutions / Electricians",
    title: "AI receptionist and CRM for electricians",
    summary: "Capture emergency callouts fast, quote cleanly, and keep the schedule moving without phone-tag.",
    bullets: [
      "Answer urgent jobs after hours and route only the ones worth taking.",
      "Book installs, switchboard upgrades, and fault-finding into the right crew calendar.",
      "Follow up on completed jobs so invoiced amounts and outcomes are logged properly.",
    ],
  },
  plumbers: {
    eyebrow: "Solutions / Plumbers",
    title: "AI receptionist and CRM for plumbers",
    summary: "Handle burst pipes, hot water failures, and quoting without getting buried in admin.",
    bullets: [
      "Prioritise urgent plumbing leads and send confirmations instantly.",
      "Track quotes, callout fees, and final invoice values in one workflow.",
      "Keep customers updated by SMS when the tradie is on the way or the job is complete.",
    ],
  },
  landscapers: {
    eyebrow: "Solutions / Landscapers",
    title: "AI receptionist and CRM for landscapers",
    summary: "Manage site visits, recurring maintenance, and larger project pipelines from one place.",
    bullets: [
      "Capture inbound enquiries and qualify maintenance versus project work automatically.",
      "Coordinate recurring jobs, route planning, and crew assignment from the scheduler.",
      "Use follow-up tasks to record outcomes, materials, and invoiced totals after each visit.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(SOLUTIONS).map((slug) => ({ slug }));
}

export default async function SolutionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solution = SOLUTIONS[slug];

  if (!solution) notFound();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-20 pt-36">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{solution.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-6xl">
            {solution.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">{solution.summary}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
          <h2 className="text-xl font-bold text-midnight">What this solution covers</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {solution.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/auth">
            <Button variant="mint">Get started</Button>
          </Link>
          <Link href="/solutions">
            <Button variant="outline">Back to solutions</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
