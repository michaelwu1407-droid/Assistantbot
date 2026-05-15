import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Earlymark",
  description: "Terms governing use of the Earlymark platform.",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last Updated: May 2026</p>

      <h2>1. Agreement</h2>
      <p>
        These Terms of Service (<strong>Terms</strong>) govern your access to and use of the Earlymark
        website, AI receptionist, CRM, messaging, scheduling, quoting, billing, and related services
        (<strong>Platform</strong>). The Platform is operated by Earlymark AI Pty Ltd{" "}
        (<strong>Earlymark</strong>, <strong>we</strong>, <strong>us</strong>, or <strong>our</strong>).
      </p>
      <p>
        By creating an account, subscribing, connecting integrations, or using the Platform, you agree
        to these Terms. If you use the Platform on behalf of a business, you represent that you have
        authority to bind that business.
      </p>

      <h2>2. Australian Business Use Only</h2>
      <p>
        The Platform is currently intended for Australian business customers only. You must not use
        the Platform for consumer, household, personal, overseas, unlawful, emergency, medical, legal,
        financial advice, or high-risk use cases unless we expressly agree in writing.
      </p>

      <h2>3. Your Account and Users</h2>
      <p>
        You are responsible for all activity under your account, workspace, connected phone numbers,
        integrations, and user logins. You must keep credentials secure, maintain accurate account
        information, promptly remove access for former staff or contractors, and notify us if you
        suspect unauthorised access.
      </p>

      <h2>4. AI Receptionist and Automated Features</h2>
      <p>
        The Platform uses AI and automation to answer calls, generate transcripts and summaries,
        classify leads, draft messages, schedule work, prepare quotes, update CRM records, and perform
        related tasks. AI outputs may be inaccurate, incomplete, delayed, or unsuitable.
      </p>
      <p>
        You remain responsible for your business decisions, customer communications, quotes,
        appointments, invoices, legal compliance, and customer outcomes. You must review AI-generated
        or automated outputs where review is appropriate or required, especially before relying on
        prices, dates, safety-critical information, contractual commitments, or invoices.
      </p>
      <p>
        Earlymark does not use customer content to train AI models. External AI systems process
        customer content to provide the Platform, and Earlymark does not authorise customer content
        to be used to train public or general-purpose AI models.
      </p>

      <h2>5. Voice Calls, Transcripts, and Customer Notice</h2>
      <p>
        Earlymark does not intentionally store call audio recordings. Live audio may be processed
        transiently to answer calls and generate outputs. We may store call metadata, transcripts,
        summaries, messages, and related CRM records.
      </p>
      <p>
        You are responsible for notifying your customers and staff that calls may be handled by an AI
        assistant and may be transcribed, summarised, or logged. You must obtain any consent required
        by law or by your own policies.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>You must not use the Platform to:</p>
      <ul>
        <li>break any law or infringe another person&apos;s rights;</li>
        <li>send spam, unlawful marketing, deceptive messages, harassment, or abusive content;</li>
        <li>impersonate others or misrepresent the source of communications;</li>
        <li>collect, upload, or disclose information unlawfully;</li>
        <li>attempt to bypass security, rate limits, billing controls, or usage limits;</li>
        <li>reverse engineer, scrape, copy, resell, or misuse the Platform;</li>
        <li>use the Platform for emergency dispatch, medical triage, safety-critical advice, or other high-risk uses;</li>
        <li>upload malicious code, unlawful content, or material you do not have rights to use.</li>
      </ul>

      <h2>7. Communications Compliance</h2>
      <p>
        You are responsible for complying with spam, privacy, telecommunications, consumer, call
        recording, and marketing laws. If you use Earlymark to send SMS, email, WhatsApp, call, or
        follow-up messages, you must ensure you have consent or another lawful basis, identify the
        sender where required, and honour unsubscribe, opt-out, and do-not-contact requests.
      </p>

      <h2>8. Third-Party Services and Integrations</h2>
      <p>
        The Platform depends on third-party providers and integrations, including providers for
        hosting, communications, AI processing, speech processing, payments, accounting, email,
        calendars, maps, monitoring, and analytics. We may add, remove, replace, suspend, or change
        providers or integrations at any time.
      </p>
      <p>
        We are not responsible for third-party outages, delays, errors, pricing changes, data handling,
        or feature changes. Your use of connected third-party services may be subject to their own
        terms and policies.
      </p>

      <h2>9. Fees, Usage, and Billing</h2>
      <p>
        You must pay all subscription, usage, call, message, setup, overage, and other fees shown at
        checkout, in your account, or otherwise agreed with us. Usage-based charges may vary based on
        call minutes, messages, provider costs, connected services, currency changes, taxes, and plan
        settings.
      </p>
      <p>
        Fees are generally non-refundable except where required by law or expressly agreed by us. We
        may suspend or limit the Platform for overdue amounts, failed payments, excessive usage,
        suspected abuse, fraud, or risk to the Platform.
      </p>

      <h2>10. Availability and Changes</h2>
      <p>
        We aim to provide a reliable service, but we do not guarantee uninterrupted, error-free, or
        instant availability. The Platform may be affected by maintenance, updates, third-party
        outages, telecommunications networks, AI provider performance, customer configuration,
        internet issues, or events outside our control.
      </p>
      <p>
        We may modify, improve, suspend, discontinue, or replace features at any time. Beta,
        experimental, preview, or trial features are provided as-is and may change or be withdrawn
        without notice.
      </p>

      <h2>11. Your Data and Content</h2>
      <p>
        You retain ownership of data and content you provide to the Platform. You grant Earlymark a
        licence to host, process, transmit, display, modify, and use that data and content as needed
        to provide, secure, support, analyse, and improve the Platform and as otherwise described in
        our Privacy Policy.
      </p>
      <p>
        You warrant that you have the rights, permissions, and lawful basis required to provide data
        and content to the Platform and to allow Earlymark to process it.
      </p>

      <h2>12. Earlymark Intellectual Property</h2>
      <p>
        The Platform, software, designs, workflows, prompts, documentation, branding, templates,
        know-how, and related intellectual property are owned by Earlymark or its licensors. You must
        not copy, modify, reverse engineer, resell, sublicense, or create competing services using the
        Platform except as expressly permitted by us in writing.
      </p>

      <h2>13. Confidentiality</h2>
      <p>
        Non-public information about the Platform, pricing, security, operations, technical design,
        and business arrangements is confidential. You must not disclose or misuse Earlymark&apos;s
        confidential information except as required to use the Platform or as required by law.
      </p>

      <h2>14. Suspension and Termination</h2>
      <p>
        We may suspend, restrict, or terminate access to the Platform if you breach these Terms, fail
        to pay, create risk for Earlymark or others, use the Platform unlawfully, misuse communications
        channels, exceed reasonable usage limits, or if required by a provider, regulator, or law.
      </p>
      <p>
        You may stop using the Platform at any time. Some data may remain in backups, logs, billing
        records, legal records, or de-identified form as described in our Privacy Policy.
      </p>

      <h2>15. Disclaimers</h2>
      <p>
        To the maximum extent permitted by law, the Platform is provided on an as-is and as-available
        basis. We do not warrant that the Platform will be uninterrupted, secure, error-free, meet
        your requirements, generate accurate outputs, capture every lead, prevent every missed call,
        or produce any particular business outcome.
      </p>
      <p>
        Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or
        remedy that cannot lawfully be excluded under the Australian Consumer Law or other applicable
        law.
      </p>

      <h2>16. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Earlymark is not liable for indirect, consequential,
        special, incidental, exemplary, or punitive loss, loss of profit, loss of revenue, loss of
        goodwill, loss of opportunity, data loss, business interruption, third-party provider failure,
        AI output error, telecommunications failure, or customer misuse.
      </p>
      <p>
        To the maximum extent permitted by law, Earlymark&apos;s total aggregate liability arising out of
        or in connection with the Platform or these Terms is limited to the greater of AUD $100 and
        the fees you paid to Earlymark for the Platform in the 30 days before the event giving rise to
        the claim.
      </p>

      <h2>17. Indemnity</h2>
      <p>
        You indemnify Earlymark, its directors, officers, employees, contractors, and agents against
        claims, losses, liabilities, damages, costs, and expenses arising from your use of the Platform,
        your breach of these Terms, your unlawful or unauthorised data handling, your customer
        communications, your connected integrations, your reliance on AI outputs, or claims made by
        your customers, staff, suppliers, or other third parties.
      </p>

      <h2>18. Governing Law and Disputes</h2>
      <p>
        These Terms are governed by the laws of New South Wales, Australia. The parties submit to the
        exclusive jurisdiction of the courts of New South Wales and courts entitled to hear appeals
        from those courts.
      </p>

      <h2>19. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time by posting a revised version on this page. The
        updated Terms apply from the date posted unless stated otherwise. Continued use of the
        Platform after an update means you accept the updated Terms.
      </p>

      <h2>20. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:support@earlymark.ai">support@earlymark.ai</a>.
      </p>
    </article>
  );
}
