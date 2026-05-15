import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Earlymark",
  description: "How Earlymark uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">Last Updated: May 2026</p>

      <h2>1. What Cookies Are</h2>
      <p>
        Cookies are small files stored on your device when you visit a website.
        Earlymark may also use similar technologies such as local storage,
        pixels, and server logs to keep the service secure, remember your
        preferences, and understand how the product is used.
      </p>

      <h2>2. How We Use Cookies</h2>
      <p>We use cookies and similar technologies for the following purposes:</p>
      <ul>
        <li>
          <strong>Essential cookies:</strong> Required for login, security,
          session management, routing, and core platform functionality.
        </li>
        <li>
          <strong>Preference cookies:</strong> Used to remember interface
          choices and reduce repeated setup steps.
        </li>
        <li>
          <strong>Analytics cookies:</strong> Used to understand aggregate
          website and product usage so we can improve reliability and usability.
        </li>
        <li>
          <strong>Marketing and measurement cookies:</strong> Used only where
          enabled to understand campaign performance and improve public pages.
        </li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>
        Some cookies or similar technologies may be set by service providers
        that help us deliver Earlymark, including hosting, authentication,
        payments, analytics, communications, and support tools.
      </p>

      <h2>4. Managing Cookies</h2>
      <p>
        You can block or delete cookies through your browser settings. Blocking
        essential cookies may prevent parts of Earlymark from working correctly,
        including sign-in, account security, and saved preferences.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about this Cookie Policy can be sent to{" "}
        <a href="mailto:privacy@earlymark.ai">privacy@earlymark.ai</a>.
      </p>
    </article>
  );
}
