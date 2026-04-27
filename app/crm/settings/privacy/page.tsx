import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  Database,
  AlertTriangle,
  Bot,
  Lock,
  Globe,
  Clock,
  Scale,
  PhoneCall,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Data and privacy</h3>
        <p className="text-sm text-slate-500">
          Full data handling policy, legal rights, and protections governing your use of Earlymark AI.
        </p>
      </div>
      <Separator />

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Terms and conditions
          </CardTitle>
          <CardDescription>Legal compliance and acceptance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            By accessing or using Earlymark AI, including this dashboard, you confirm that you have read,
            understood, and agree to be bound by our Terms of Service and this Privacy Policy in full. If
            you do not agree, you must cease using the platform immediately.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI reserves the right to modify these terms at any time without prior notice.
            Continued use of the platform after any modification constitutes your acceptance of the
            revised terms. You are responsible for reviewing these documents periodically.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/terms" target="_blank">View terms of service</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/privacy" target="_blank">View privacy policy</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            How your data is handled
          </CardTitle>
          <CardDescription>Transparency on collection, storage, and use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI collects and processes the following categories of data to provide and improve the platform:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Identity data:</strong> Names, email addresses, phone numbers, and ABN/ACN.</li>
            <li><strong>Job and commercial data:</strong> Job notes, site addresses, schedules, quotes, invoices, and client records.</li>
            <li><strong>Financial data:</strong> Payment method details and transaction history processed via Stripe and Xero.</li>
            <li><strong>Communications data:</strong> SMS content, voice call recordings, and AI conversation logs.</li>
            <li><strong>Usage and device data:</strong> IP addresses, browser type, device identifiers, feature usage patterns, and session logs.</li>
            <li><strong>AI-inferred data:</strong> Predicted preferences, lead quality scores, and customer sentiment derived by AI models.</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your data is used for service delivery, billing, fraud prevention, security monitoring, internal analytics,
            and product improvement, including the use of de-identified and aggregated data to improve Earlymark AI&apos;s
            models and features. <strong>We do not sell your personal data to third parties for advertising.</strong>
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data policy
          </CardTitle>
          <CardDescription>Formal data processing statement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI Pty Ltd is the data controller for all personal information collected through this platform.
            Data is processed on the following lawful bases:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Contractual necessity:</strong> Processing required to deliver the services you subscribed to.</li>
            <li><strong>Legitimate business interest:</strong> Analytics, security monitoring, fraud prevention, and product improvement.</li>
            <li><strong>Legal obligation:</strong> Financial records, tax compliance, and regulatory requirements.</li>
            <li><strong>Consent:</strong> Implied by continued use of the platform. Withdrawal of consent requires account closure.</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            User rights are limited to those conferred by the Australian Privacy Act 1988 and applicable Australian
            Privacy Principles. Earlymark AI does not make voluntary commitments under GDPR or CCPA unless required by law.
          </p>
        </CardContent>
      </Card>

      <Card className="border-orange-100 shadow-sm dark:border-orange-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-orange-500" />
            AI disclaimer
            <Badge variant="secondary" className="ml-2 bg-orange-50 text-orange-600 dark:bg-orange-900/20">Important</Badge>
          </CardTitle>
          <CardDescription>Limitations of AI-generated content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AI-generated outputs, including quotes, job schedules, customer messages, and reports, are automated
            suggestions only. <strong>Earlymark AI makes no representation or warranty, express or implied,
            as to the accuracy, completeness, fitness for purpose, or reliability of any AI-generated content.</strong>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The subscribing business bears sole and exclusive responsibility for reviewing, approving, and
            acting on any AI-generated content before it is sent to customers or relied upon for commercial
            decisions. Earlymark AI accepts no liability for any loss, cost, claim, or damage arising from
            reliance on AI outputs, including but not limited to inaccurate quotes, missed appointments,
            or miscommunicated terms.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data retention and aggregation
          </CardTitle>
          <CardDescription>How long data is kept and how aggregated data is used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI retains personal data for as long as necessary to provide the service and meet legal obligations.
            Minimum retention periods include:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-4 text-left font-medium text-slate-700 dark:text-slate-300">Data type</th>
                  <th className="py-2 text-left font-medium text-slate-700 dark:text-slate-300">Retention period</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-400">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">Contact and job records</td>
                  <td className="py-2">Life of account plus 2 years</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">Financial records (invoices, payments)</td>
                  <td className="py-2">7 years (tax law)</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">AI conversation logs</td>
                  <td className="py-2">90 days</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">Security and access logs</td>
                  <td className="py-2">12 months</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Deleted account personal data</td>
                  <td className="py-2">Up to 90 days grace, then purged</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Aggregated and de-identified data, which does not constitute personal information, is retained
            by Earlymark AI indefinitely and may be used without restriction for analytics, benchmarking,
            and product improvement, including after account closure.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security measures
          </CardTitle>
          <CardDescription>How data is protected in transit and at rest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>AES-256-GCM encryption for data at rest, including OAuth tokens and sensitive credentials.</li>
            <li>TLS 1.3 encryption for all data in transit.</li>
            <li>Role-based access controls restricting data access to authorised personnel only.</li>
            <li>Audit logging of sensitive operations and access events.</li>
            <li>Automated secret scanning and security monitoring.</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>No system is 100 percent secure.</strong> Earlymark AI does not warrant that the platform
            will be free from unauthorised access, data loss, or cyberattack. Earlymark AI is not liable
            for breaches caused by user negligence, including weak passwords, shared credentials, or
            unauthorised access via credentials held by the user or their staff.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Third-party sub-processors
          </CardTitle>
          <CardDescription>Providers who receive data to power platform features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI shares minimum necessary data with the following sub-processors to deliver platform
            functionality. By using this platform, you accept the terms and privacy policies of each
            sub-processor as a condition of use.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-4 text-left font-medium text-slate-700 dark:text-slate-300">Provider</th>
                  <th className="py-2 text-left font-medium text-slate-700 dark:text-slate-300">Purpose and data shared</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-400">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium">Supabase</td>
                  <td className="py-2">Database storage (AU region). All platform data.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium">Twilio</td>
                  <td className="py-2">SMS and voice communications. Phone numbers, message content.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium">LiveKit</td>
                  <td className="py-2">WebRTC voice infrastructure. Call audio streams.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium">Google (Gemini / Maps)</td>
                  <td className="py-2">AI processing and location verification. Conversation context, addresses.</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium">Xero</td>
                  <td className="py-2">Accounting and invoicing. Financial records, client details.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Stripe</td>
                  <td className="py-2">Payment processing. Payment method and transaction data.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI is not responsible for the data handling practices of sub-processors and accepts
            no liability for data breaches, losses, or misuse by any third-party provider.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Limitation of liability
          </CardTitle>
          <CardDescription>Earlymark AI&apos;s maximum legal exposure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            To the maximum extent permitted by applicable law, Earlymark AI&apos;s total cumulative liability
            arising out of or in connection with your use of the platform, including any claim relating
            to data handling, privacy, or AI outputs, is capped at the <strong>greater of AUD $100 or
            the total fees paid by you in the 30 days immediately preceding the claim.</strong>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Earlymark AI expressly excludes all liability for:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>Indirect, special, consequential, incidental, punitive, or exemplary loss or damage.</li>
            <li>Loss of profits, revenue, contracts, data, goodwill, or business opportunity.</li>
            <li>Loss or corruption of data resulting from platform outages, bugs, or third-party failures.</li>
            <li>Any loss arising from reliance on AI-generated content.</li>
            <li>Any breach caused by user negligence, misconfiguration, or unauthorised access.</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nothing in this section limits liability that cannot be excluded under the Australian Consumer Law.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Your data rights
          </CardTitle>
          <CardDescription>Rights available under the Australian Privacy Act 1988.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your data rights are governed by the Australian Privacy Act 1988 and the Australian Privacy
            Principles. These include:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Right of access:</strong> You may request a copy of the personal information Earlymark AI holds about you.</li>
            <li><strong>Right to correction:</strong> You may request correction of inaccurate or outdated personal information.</li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Requests will be responded to within 30 days. Earlymark AI may decline a request if it would
            impose an unreasonable burden, conflict with a legal obligation, or relate to data that has
            already been de-identified. <strong>Earlymark AI does not make voluntary commitments under
            GDPR, CCPA, or any other overseas privacy framework.</strong>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            To submit a request, contact{" "}
            <a href="mailto:privacy@earlymark.ai" className="text-blue-600 hover:underline dark:text-blue-400">
              privacy@earlymark.ai
            </a>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Contact and dispute resolution
          </CardTitle>
          <CardDescription>How to raise privacy concerns and how disputes are handled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            For any privacy-related enquiries or to exercise your data rights, contact our Privacy Officer at{" "}
            <a href="mailto:privacy@earlymark.ai" className="text-blue-600 hover:underline dark:text-blue-400">
              privacy@earlymark.ai
            </a>. We will acknowledge your request within 5 business days and respond within 30 days.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This policy is governed by the laws of New South Wales, Australia. Any dispute arising from or
            in connection with this policy or your use of the platform is subject to the exclusive
            jurisdiction of the courts of New South Wales. <strong>You waive any right to participate in
            class-action or representative proceedings</strong> against Earlymark AI. Where permitted,
            Earlymark AI may elect to resolve disputes through binding arbitration.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If you are unsatisfied with our response, you may lodge a complaint with the{" "}
            <strong>Office of the Australian Information Commissioner (OAIC)</strong> at{" "}
            <a
              href="https://www.oaic.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              oaic.gov.au
            </a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
