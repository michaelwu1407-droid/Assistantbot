import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Technologies Policy | Earlymark",
  description: "How Earlymark uses cookies, local storage, analytics, and similar technologies.",
};

export default function WebsiteTechnologiesPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Website Technologies Policy</h1>
      <p className="text-sm text-muted-foreground">Last Updated: May 2026</p>

      <h2>1. About This Policy</h2>
      <p>
        This policy explains how Earlymark AI Pty Ltd (<strong>Earlymark</strong>,{" "}
        <strong>we</strong>, <strong>us</strong>, or <strong>our</strong>) uses cookies, local
        storage, pixels, logs, SDKs, and similar technologies on our website and Platform.
      </p>

      <h2>2. Technologies We Use</h2>
      <p>We may use:</p>
      <ul>
        <li>
          <strong>Cookies:</strong> small files stored by your browser to remember session,
          security, preference, or analytics information.
        </li>
        <li>
          <strong>Local and session storage:</strong> browser storage used for preferences,
          authentication state, product settings, and interface behaviour.
        </li>
        <li>
          <strong>Pixels and SDKs:</strong> scripts or tags used for analytics, performance,
          diagnostics, attribution, or security.
        </li>
        <li>
          <strong>Server logs:</strong> records of requests, device information, IP addresses,
          errors, security events, and performance data.
        </li>
      </ul>

      <h2>3. Why We Use Them</h2>
      <p>We use website technologies for:</p>
      <ul>
        <li><strong>Essential operation:</strong> login, authentication, security, fraud prevention, routing, and account access.</li>
        <li><strong>Preferences:</strong> remembering workspace settings, interface choices, and form state.</li>
        <li><strong>Analytics:</strong> understanding aggregate website and product usage.</li>
        <li><strong>Performance and reliability:</strong> diagnosing errors, crashes, latency, and service issues.</li>
        <li><strong>Marketing measurement:</strong> understanding which campaigns, pages, or referrals lead to enquiries or signups.</li>
        <li><strong>Product improvement:</strong> improving onboarding, navigation, conversion, reliability, and feature design.</li>
      </ul>

      <h2>4. Third-Party Tools</h2>
      <p>
        We may use third-party tools for hosting, authentication, analytics, monitoring, support,
        advertising measurement, communications, payments, and security. These tools may set their
        own cookies or similar identifiers and may process data outside Australia.
      </p>

      <h2>5. Managing Cookies and Similar Technologies</h2>
      <p>
        You can block or delete cookies and similar technologies through your browser or device
        settings. If you block essential technologies, parts of the website or Platform may not work,
        including login, account security, checkout, saved preferences, or connected workflows.
      </p>

      <h2>6. Do Not Track</h2>
      <p>
        Some browsers provide a &quot;Do Not Track&quot; setting. There is no consistent industry standard
        for responding to these signals, so our website may not respond to them. You can still control
        cookies and storage through your browser settings.
      </p>

      <h2>7. Updates</h2>
      <p>
        We may update this policy from time to time by posting a revised version on this page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:privacy@earlymark.ai">privacy@earlymark.ai</a>.
      </p>
    </article>
  );
}
