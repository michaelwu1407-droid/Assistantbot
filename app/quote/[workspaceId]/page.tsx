import { notFound } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Public hosted quote form — `/quote/<workspaceId>`.
 *
 * This is the URL the tradie shares from their website ("Get a Quote"
 * button), business cards, Google My Business profile, SMS replies, etc.
 * It POSTs straight to the existing /api/webhooks/webform endpoint and
 * redirects to the thanks page — no JavaScript required, no tradie-side
 * email-forwarding setup required, no testing required. We control the
 * form end-to-end so it works 100% out of the box.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ workspaceId: string }> };

export default async function HostedQuoteFormPage({ params }: Props) {
  const { workspaceId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) notFound();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-md shadow-sm p-6 sm:p-8">
        <div className="mb-6 space-y-1">
          <p className="app-micro-label">Request a quote</p>
          <h1 className="app-page-title">{workspace.name}</h1>
          <p className="app-body-secondary">
            Tell us what you need and we&apos;ll get back to you shortly.
          </p>
        </div>

        <form
          method="POST"
          action="/api/webhooks/webform"
          className="space-y-4"
        >
          <input type="hidden" name="workspace_id" value={workspace.id} />
          <input type="hidden" name="source" value="hosted_form" />
          <input
            type="hidden"
            name="redirect_url"
            value={`/quote/${workspace.id}/thanks`}
          />
          {/* honeypot — bots fill it, humans don't see it */}
          <input
            type="text"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="space-y-1.5">
            <label htmlFor="name" className="app-field-label">Your name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="app-field-label">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="04xx xxx xxx"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="app-field-label">Email (optional)</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="address" className="app-field-label">Job address (optional)</label>
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="app-field-label">What do you need done?</label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              placeholder="Describe the job, materials, urgency, etc."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Request a quote
          </button>

          <p className="app-body-secondary text-center text-xs">
            By submitting, you agree to be contacted about your enquiry.
          </p>
        </form>
      </div>
    </div>
  );
}
