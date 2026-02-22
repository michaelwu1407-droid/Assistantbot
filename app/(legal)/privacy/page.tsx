import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Earlymark",
  description: "How Earlymark collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last Updated: February 2026</p>

      <h2>1. Data Collection &amp; AI Processing</h2>
      <p>
        We collect personal information including names, phone numbers, and
        physical addresses to facilitate trade services. You acknowledge that
        this data is processed by Artificial Intelligence (AI) models, including
        Google Gemini, to automate communications, scheduling, and quoting.
      </p>

      <h2>2. Third-Party Integrations</h2>
      <p>
        Data is shared with essential service providers to perform platform
        functions:
      </p>
      <ul>
        <li>
          <strong>Twilio / Retell AI:</strong> For voice and SMS communications.
        </li>
        <li>
          <strong>Google Maps:</strong> For location verification and proximity
          tracking.
        </li>
        <li>
          <strong>Xero / Stripe:</strong> For financial processing and
          invoicing.
        </li>
      </ul>

      <h2>3. Data Residency</h2>
      <p>
        All platform data is stored securely using Supabase with encryption at
        rest.
      </p>

      <h2>4. Your Rights</h2>
      <p>
        Under the Australian Privacy Act (2026 updates), you have the right to
        access your data and request corrections. To exercise these rights,
        contact us at{" "}
        <a href="mailto:privacy@earlymark.ai">privacy@earlymark.ai</a>.
      </p>
    </article>
  );
}
