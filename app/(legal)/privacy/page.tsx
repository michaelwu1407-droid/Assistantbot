import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Earlymark",
  description: "How Earlymark collects, uses, discloses, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last Updated: May 2026</p>

      <h2>1. About This Policy</h2>
      <p>
        This Privacy Policy explains how Earlymark AI Pty Ltd (<strong>Earlymark</strong>,{" "}
        <strong>we</strong>, <strong>us</strong>, or <strong>our</strong>) collects, uses, holds,
        and discloses personal information in connection with the Earlymark website, AI receptionist,
        CRM, messaging, scheduling, quoting, billing, and related services (<strong>Platform</strong>).
      </p>
      <p>
        The Platform is intended for Australian business customers only. By using the Platform, you
        confirm that you are using it for business purposes in Australia and that you are authorised
        to provide personal information about your staff, customers, suppliers, and other contacts.
      </p>

      <h2>2. Your Responsibilities</h2>
      <p>
        You are responsible for the personal information you enter into the Platform or cause the
        Platform to collect on your behalf. This includes ensuring that your customers and staff are
        properly notified, that any required consents are obtained, and that your use of AI, phone,
        SMS, email, and follow-up workflows complies with applicable laws, including privacy,
        consumer, spam, and telecommunications laws.
      </p>

      <h2>3. Information We Collect</h2>
      <p>We may collect and hold the following kinds of information:</p>
      <ul>
        <li>
          <strong>Account and identity information:</strong> names, email addresses, phone numbers,
          business names, ABNs, roles, login details, and workspace settings.
        </li>
        <li>
          <strong>Business and job information:</strong> customer details, job descriptions, site
          addresses, notes, schedules, pipeline stages, quotes, invoices, photos, files, and related
          records.
        </li>
        <li>
          <strong>Communications information:</strong> SMS and email content, call metadata, call
          transcripts, AI-generated summaries, follow-up records, and support messages.
        </li>
        <li>
          <strong>Voice interaction information:</strong> live call audio may be processed transiently
          so the AI receptionist can answer and respond. Earlymark does not intentionally store call
          audio recordings. We may store transcripts, summaries, call outcomes, phone numbers, dates,
          times, durations, and related CRM records.
        </li>
        <li>
          <strong>Billing and transaction information:</strong> subscription status, invoices,
          payment status, billing identifiers, usage charges, and related payment metadata. Full card
          details are handled by payment providers.
        </li>
        <li>
          <strong>Device, usage, and security information:</strong> IP addresses, browser and device
          details, log data, cookies or similar identifiers, product usage events, crash reports, and
          security audit records.
        </li>
        <li>
          <strong>AI output and derived information:</strong> classifications, summaries, suggested
          replies, draft quotes, appointment suggestions, lead status, and other outputs generated
          from information in the Platform.
        </li>
      </ul>

      <h2>4. How We Collect Information</h2>
      <p>We collect information when:</p>
      <ul>
        <li>you create an account, configure your workspace, or use the Platform;</li>
        <li>your staff, customers, or contacts interact with your AI receptionist or CRM workflows;</li>
        <li>you connect third-party services such as calendars, accounting, email, or messaging tools;</li>
        <li>you contact us for support, sales, billing, or product feedback;</li>
        <li>we receive webhook, delivery, usage, security, or billing events from service providers;</li>
        <li>our website or Platform records usage, diagnostic, security, or performance information.</li>
      </ul>

      <h2>5. How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>provide, operate, secure, maintain, and improve the Platform;</li>
        <li>answer calls, generate transcripts and summaries, send messages, schedule jobs, and update CRM records;</li>
        <li>process subscriptions, usage charges, invoices, credits, referrals, and payments;</li>
        <li>provide onboarding, support, troubleshooting, alerts, and service communications;</li>
        <li>monitor reliability, prevent fraud, enforce limits, detect abuse, and protect the Platform;</li>
        <li>develop and improve features using aggregated, de-identified, or operational analytics;</li>
        <li>comply with legal obligations, respond to lawful requests, and protect our rights.</li>
      </ul>

      <h2>6. AI Processing and Model Training</h2>
      <p>
        The Platform uses external AI systems to generate responses, summaries, classifications,
        drafts, and other outputs. Customer content is processed to provide the service and generate
        requested outputs.
      </p>
      <p>
        Earlymark does not use customer content to train AI models. Earlymark does not operate its
        own foundation models. External AI systems are used to provide the service, and Earlymark does
        not authorise customer content to be used to train public or general-purpose AI models.
      </p>
      <p>
        AI outputs may be inaccurate, incomplete, delayed, or unsuitable for a particular purpose.
        You are responsible for reviewing AI-generated quotes, schedules, messages, invoices, and
        other actions before relying on them where review is appropriate or required.
      </p>

      <h2>7. Disclosure to Service Providers</h2>
      <p>
        We use third-party service providers to deliver the Platform. To avoid exposing unnecessary
        operational detail, this public policy describes provider categories rather than naming every
        provider. Providers may include services for:
      </p>
      <ul>
        <li>hosting, database, storage, authentication, and infrastructure;</li>
        <li>telephony, SMS, email, voice, and real-time communications;</li>
        <li>AI processing, speech-to-text, text-to-speech, and automation;</li>
        <li>payments, billing, accounting, and invoicing integrations;</li>
        <li>maps, address lookup, calendars, email inboxes, and other connected tools;</li>
        <li>analytics, error monitoring, security logging, and support.</li>
      </ul>
      <p>
        We require service providers to use information only for authorised purposes. Some providers
        may process or store information outside Australia, including in countries such as the United
        States, New Zealand, the United Kingdom, Singapore, or member states of the European Union.
        We take reasonable steps to use reputable providers and appropriate contractual, technical,
        and organisational controls.
      </p>

      <h2>8. Marketing and Electronic Messages</h2>
      <p>
        We may send service, billing, security, onboarding, and product communications. We may send
        marketing communications where we have consent or are otherwise permitted by law. Commercial
        electronic messages will identify Earlymark and include a functional unsubscribe or opt-out
        mechanism where required.
      </p>
      <p>
        If you use the Platform to send messages to your customers, you are responsible for ensuring
        you have consent or another lawful basis to send those messages and for honouring unsubscribe,
        opt-out, and do-not-contact requests.
      </p>

      <h2>9. Cookies and Website Technologies</h2>
      <p>
        We use cookies, local storage, pixels, logs, and similar technologies for authentication,
        security, preferences, analytics, performance, error monitoring, and product improvement.
        More information is available in our{" "}
        <a href="/cookies">Website Technologies Policy</a>.
      </p>

      <h2>10. Retention</h2>
      <p>
        We retain information for as long as reasonably necessary to provide the Platform, comply with
        legal obligations, resolve disputes, enforce agreements, maintain security, and protect our
        legitimate business interests. Typical retention periods include:
      </p>
      <table>
        <thead>
          <tr>
            <th>Information type</th>
            <th>Typical retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account, workspace, contact, job, quote, invoice, and CRM records</td>
            <td>For the life of the account and up to 2 years after closure, unless deleted earlier or retained for legal reasons</td>
          </tr>
          <tr>
            <td>Billing, tax, payment, and accounting records</td>
            <td>Up to 7 years or longer if required by law</td>
          </tr>
          <tr>
            <td>Call audio</td>
            <td>Not intentionally stored by Earlymark</td>
          </tr>
          <tr>
            <td>Transcripts, summaries, messages, AI logs, and communication records</td>
            <td>While the account is active and up to 2 years after closure, unless deleted earlier or retained for legal reasons</td>
          </tr>
          <tr>
            <td>Security, audit, diagnostic, and access logs</td>
            <td>Usually up to 12 months, or longer for investigation, fraud prevention, or security purposes</td>
          </tr>
          <tr>
            <td>Deleted account data and backups</td>
            <td>Usually purged or de-identified within 90 days, subject to backups, legal holds, and billing records</td>
          </tr>
          <tr>
            <td>Aggregated or de-identified information</td>
            <td>Indefinitely</td>
          </tr>
        </tbody>
      </table>

      <h2>11. Security</h2>
      <p>
        We use reasonable technical and organisational safeguards designed to protect personal
        information, including access controls, encryption in transit, credential protection,
        monitoring, logging, and operational security practices. No internet or cloud service can be
        guaranteed to be completely secure, and you are responsible for maintaining secure passwords,
        devices, integrations, and user permissions.
      </p>

      <h2>12. Access and Correction</h2>
      <p>
        You may request access to, or correction of, personal information we hold about you, subject
        to the Australian Privacy Act 1988 and Australian Privacy Principles. We may refuse or limit
        access where permitted by law, including where a request is unreasonable, would affect the
        privacy of others, would reveal confidential commercial information, or would compromise
        security.
      </p>
      <p>
        To make a request, contact <a href="mailto:privacy@earlymark.ai">privacy@earlymark.ai</a>.
      </p>

      <h2>13. Data Breaches</h2>
      <p>
        If we become aware of a data breach, we will assess it and take steps we consider appropriate.
        Where required by the Notifiable Data Breaches scheme, we will notify affected individuals and
        the Office of the Australian Information Commissioner.
      </p>

      <h2>14. Business Transfers</h2>
      <p>
        If Earlymark is involved in a merger, acquisition, restructure, financing, sale of assets, or
        similar transaction, personal information may be disclosed or transferred as part of that
        transaction, subject to applicable law.
      </p>

      <h2>15. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time by posting a revised version on this page.
        The updated policy applies from the date it is posted, unless stated otherwise. Continued use
        of the Platform after an update means you accept the updated policy.
      </p>

      <h2>16. Contact and Complaints</h2>
      <p>
        Privacy questions, requests, or complaints should be sent to:
      </p>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:privacy@earlymark.ai">privacy@earlymark.ai</a>
      </p>
      <p>
        If you are not satisfied with our response, you may contact the Office of the Australian
        Information Commissioner at{" "}
        <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">
          oaic.gov.au
        </a>.
      </p>
    </article>
  );
}
