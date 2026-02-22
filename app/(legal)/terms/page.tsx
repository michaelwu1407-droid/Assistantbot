import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Earlymark",
  description: "Terms governing your use of the Earlymark platform.",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last Updated: February 2026</p>

      <h2>1. AI Agent Representation</h2>
      <p>
        Earlymark provides AI-driven agents that interact with your customers.
        While we strive for high accuracy, the Business (the Subscriber) is
        ultimately responsible for reviewing all AI-generated quotes, schedules,
        and Xero draft invoices before finalization.
      </p>

      <h2>2. Use of Service</h2>
      <p>
        You agree to use the platform solely for legitimate trade business
        operations and will not use the AI agents to generate spam or predatory
        communications.
      </p>

      <h2>3. Australian Consumer Law</h2>
      <p>
        Our services come with guarantees that cannot be excluded under the
        Australian Consumer Law. Nothing in these terms purports to modify or
        exclude the conditions, warranties and undertakings implied by the{" "}
        <em>Competition and Consumer Act 2010</em> (Cth) and any equivalent
        state or territory legislation.
      </p>
    </article>
  );
}
