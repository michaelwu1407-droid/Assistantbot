"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendSMS } from "./messaging-actions";
import { createNotification } from "./notification-actions";

// ─── Validation ─────────────────────────────────────────────

const LineItemSchema = z.object({
  desc: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be non-negative"),
});

const GenerateQuoteSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  items: z.array(LineItemSchema).min(1, "At least one line item is required"),
});

// ─── Types ──────────────────────────────────────────────────

export type LineItem = z.infer<typeof LineItemSchema>;

export interface QuoteResult {
  success: boolean;
  total?: number;
  invoiceNumber?: string;
  dealId?: string;
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────

/**
 * Fetch active jobs for the Tradie view.
 * "Jobs" are typically Deals in 'WON' (Scheduled) or 'INVOICED' (Completed/Billing) state,
 * or any active state depending on workflow. 
 * For this demo, we'll fetch all deals that aren't LOST or ARCHIVED.
 */
export async function getTradieJobs(workspaceId: string) {
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      stage: { in: ["WON", "INVOICED", "NEGOTIATION", "CONTACTED", "NEW"] }, // Broad filter for demo
      // In a real app, we'd filter by assigned user or specific "Job" status field
    },
    include: {
      contact: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { scheduledAt: "asc" } // Sort by schedule time
  });

  return deals.map(deal => ({
    id: deal.id,
    title: deal.title,
    clientName: deal.contact.name,
    address: deal.contact.address || "No Address", // Fallback
    status: deal.jobStatus || deal.stage, // Use jobStatus if available, else stage
    value: deal.value ? Number(deal.value) : 0,
    scheduledAt: deal.scheduledAt || deal.updatedAt, // Use scheduledAt if available
    description: (deal.metadata as any)?.description || "No description provided."
  }));
}

/**
 * Get specifically today's schedule.
 * Filters jobs scheduled for the current day.
 */
export async function getTodaySchedule(workspaceId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const jobs = await db.deal.findMany({
    where: {
      workspaceId,
      OR: [
        // Jobs for today
        {
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        // Overdue jobs (before today AND not completed/cancelled)
        {
          scheduledAt: { lt: startOfDay },
          jobStatus: { notIn: ["COMPLETED", "CANCELLED"] },
          stage: { notIn: ["WON", "LOST", "ARCHIVED"] }
        }
      ],
      jobStatus: { not: "CANCELLED" }
    },
    include: {
      contact: true
    },
    orderBy: { scheduledAt: "asc" }
  });

  return jobs.map(job => ({
    id: job.id,
    title: job.title,
    time: job.scheduledAt ? job.scheduledAt.toLocaleTimeString("en-AU", { hour: 'numeric', minute: '2-digit' }) : "All Day",
    client: job.contact.name,
    address: job.address || job.contact.address || "No address",
    status: job.jobStatus || "SCHEDULED",
    lat: job.latitude,
    lng: job.longitude
  }));
}

/**
 * Get the immediate next job for the dashboard "Up Next" card.
 * Finds the first job scheduled in the future.
 */
export async function getNextJob(workspaceId: string) {
  // 1. Check for any currently active job (TRAVELING or ON_SITE)
  const activeJob = await db.deal.findFirst({
    where: {
      workspaceId,
      jobStatus: { in: ["TRAVELING", "ON_SITE"] }
    },
    include: { contact: true },
    orderBy: { scheduledAt: "asc" }
  });

  if (activeJob) {
    return {
      id: activeJob.id,
      title: activeJob.title,
      client: activeJob.contact.name,
      time: activeJob.scheduledAt,
      address: activeJob.address || activeJob.contact.address,
      status: activeJob.jobStatus,
      safetyCheckCompleted: activeJob.safetyCheckCompleted,
      description: (activeJob.metadata as any)?.description
    };
  }

  // 2. If no active job, get the next scheduled one
  const now = new Date();
  const nextJob = await db.deal.findFirst({
    where: {
      workspaceId,
      scheduledAt: { gt: now },
      jobStatus: { notIn: ["COMPLETED", "CANCELLED", "TRAVELING", "ON_SITE"] } // Exclude statuses we checked above
    },
    include: { contact: true },
    orderBy: { scheduledAt: "asc" }
  });

  if (!nextJob) return null;

  return {
    id: nextJob.id,
    title: nextJob.title,
    client: nextJob.contact.name,
    time: nextJob.scheduledAt,
    address: nextJob.address || nextJob.contact.address,
    status: nextJob.jobStatus,
    safetyCheckCompleted: nextJob.safetyCheckCompleted,
    description: (nextJob.metadata as any)?.description
  };
}

/**
 * Fetch full details for a specific job (Deal).
 */
export async function getJobDetails(jobId: string) {
  const deal = await db.deal.findUnique({
    where: { id: jobId },
    include: {
      contact: true,
      activities: {
        orderBy: { createdAt: "desc" }
      },
      invoices: {
        orderBy: { createdAt: "desc" }
      },
      jobPhotos: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!deal) return null;

  return {
    id: deal.id,
    title: deal.title,
    client: {
      name: deal.contact.name,
      phone: deal.contact.phone,
      email: deal.contact.email,
      address: deal.contact.address,
    },
    status: deal.jobStatus || deal.stage,
    value: deal.value ? Number(deal.value) : 0,
    description: (deal.metadata as any)?.description || "No description provided.",
    activities: deal.activities,
    invoices: deal.invoices.map(inv => ({
      ...inv,
      total: Number(inv.total),
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax)
    })),
    photos: deal.jobPhotos,
    safetyCheckCompleted: deal.safetyCheckCompleted
  };
}

/**
 * Send "On My Way" SMS to the client.
 */
export async function sendOnMyWaySMS(jobId: string) {
  const deal = await db.deal.findUnique({
    where: { id: jobId },
    include: { contact: true }
  });

  if (!deal || !deal.contact.phone) {
    return { success: false, error: "No contact phone number found." };
  }

  const message = `Hi ${deal.contact.name}, I'm on my way to ${deal.title}. See you soon!`;

  // Use the messaging action
  const result = await sendSMS(deal.contactId, message);

  if (result.success) {
    // Log specific activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Travel Started",
        content: "Sent 'On My Way' SMS to client.",
        dealId: jobId,
        contactId: deal.contactId
      }
    });
  }

  return result;
}

/**
 * Update job status (Tradie workflow).
 * Handles transitions like PENDING -> TRAVELING -> ARRIVED -> COMPLETED.
 */
export async function updateJobStatus(jobId: string, status: 'SCHEDULED' | 'TRAVELING' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED') {
  // 1. Update DB
  try {
    await db.deal.update({
      where: { id: jobId },
      data: {
        jobStatus: status,
        // If completed, also update stage to WON (or INVOICED if we want to trigger billing)
        ...(status === 'COMPLETED' ? { stage: 'WON' } : {}),
        lastActivityAt: new Date(),
      }
    });
  } catch (e) {
    console.error("Error updating job status", e);
    return { success: false, error: "Failed to update status" };
  }

  // 2. Trigger Side Effects
  if (status === 'TRAVELING') {
    await sendOnMyWaySMS(jobId);
  }

  if (status === 'COMPLETED') {
    // Notify workspace users
    const deal = await db.deal.findUnique({
      where: { id: jobId },
      include: { workspace: { include: { users: true } } }
    });

    if (deal) {
      for (const user of deal.workspace.users) {
        await createNotification({
          userId: user.id,
          title: "Job Completed",
          message: `Job "${deal.title}" has been marked as completed.`,
          type: "SUCCESS",
          link: `/dashboard/jobs/${jobId}`
        });
      }
    }
  }

  revalidatePath('/dashboard/tradie');
  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { success: true, status };
}

/**
 * Mark safety check as completed.
 */
export async function completeSafetyCheck(
  jobId: string,
  checks?: { siteSafe: boolean; powerOff: boolean; ppeWorn: boolean }
) {
  const deal = await db.deal.findUnique({
    where: { id: jobId },
    select: { metadata: true }
  });

  const currentMetadata = (deal?.metadata as Record<string, any>) || {};

  await db.deal.update({
    where: { id: jobId },
    data: {
      safetyCheckCompleted: true,
      metadata: {
        ...currentMetadata,
        safetyChecks: checks,
        safetyCheckTime: new Date().toISOString()
      }
    }
  });

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Safety Check Completed",
      content: "Site safety check passed.",
      dealId: jobId
    }
  });

  revalidatePath(`/dashboard/jobs/${jobId}`);
  return { success: true };
}

/**
 * Update job schedule (drag and drop).
 */
export async function updateJobSchedule(jobId: string, scheduledAt: Date) {
  try {
    const deal = await db.deal.update({
      where: { id: jobId },
      data: {
        scheduledAt,
        // If it was previously unscheduled (NEW/CONTACTED), move to WON (Scheduled) logic or similar?
        // For now, just update the time.
        lastActivityAt: new Date()
      }
    });

    revalidatePath('/dashboard/tradie/schedule');
    return { success: true, scheduledAt: deal.scheduledAt };
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return { success: false, error: "Failed to update schedule" };
  }
}

export async function saveJobPhoto(dealId: string, url: string, caption?: string) {
  try {
    await db.jobPhoto.create({
      data: {
        dealId,
        url,
        caption
      }
    });

    // Log activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Photo added",
        content: "Added a new photo to the job diary.",
        dealId
      }
    });

    revalidatePath(`/dashboard/jobs/${dealId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to save photo:", error);
    return { success: false, error: "Failed to save photo record" };
  }
}

/**
 * Create a quote variation (add items to a job).
 */
export async function createQuoteVariation(jobId: string, items: Array<{ desc: string; price: number }>) {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  const deal = await db.deal.findUnique({ where: { id: jobId } });
  if (!deal) return { success: false, error: "Job not found" };

  const existingMeta = (deal.metadata as Record<string, unknown>) || {};
  const existingVariations = (existingMeta.variations as Array<unknown>) || [];

  await db.deal.update({
    where: { id: jobId },
    data: {
      value: Number(deal.value) + total, // Update total value
      lastActivityAt: new Date(),
      metadata: JSON.parse(JSON.stringify({
        ...existingMeta,
        variations: [...existingVariations, ...items]
      }))
    }
  });

  // Log activity
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Variation added",
      content: `Added variation: ${items.map(i => i.desc).join(", ")} ($${total})`,
      dealId: jobId,
      contactId: deal.contactId
    }
  });

  return {
    success: true,
    total,
    pdfUrl: `/api/quotes/${jobId}/variation`
  };
}

/**
 * Generate a quick quote for a Tradie deal.
 * Calculates total from line items, updates deal value + metadata,
 * sets stage to INVOICED, and creates an Invoice record.
 */
export async function generateQuote(
  dealId: string,
  items: LineItem[]
): Promise<QuoteResult> {
  const parsed = GenerateQuoteSchema.safeParse({ dealId, items });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const deal = await db.deal.findUnique({
    where: { id: parsed.data.dealId },
  });

  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1; // 10% GST (Australian)
  const total = subtotal + tax;

  const existingMetadata = (deal.metadata as Record<string, unknown>) ?? {};

  // Update: deal
  await db.deal.update({
    where: { id: parsed.data.dealId },
    data: {
      value: total,
      stage: "INVOICED",
      metadata: JSON.parse(JSON.stringify({
        ...existingMetadata,
        line_items: parsed.data.items,
        quoted_at: new Date().toISOString(),
        subtotal,
        tax,
      })),
    },
  });

  // Create an Invoice record
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  await db.invoice.create({
    data: {
      number: invoiceNumber,
      lineItems: JSON.parse(JSON.stringify(parsed.data.items)),
      subtotal,
      tax,
      total,
      status: "DRAFT",
      dealId: parsed.data.dealId,
    },
  });

  // Log the activity
  await db.activity.create({
    data: {
      type: "TASK",
      title: "Quote generated",
      content: `Generated quote ${invoiceNumber} for $${total.toLocaleString()} (${parsed.data.items.length} items)`,
      dealId: parsed.data.dealId,
      contactId: deal.contactId,
    },
  });

  return { success: true, total, invoiceNumber, dealId: parsed.data.dealId };
}

/**
 * Get invoices for a deal.
 */
export async function getDealInvoices(dealId: string) {
  return db.invoice.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mark an invoice as issued/sent.
 */
export async function issueInvoice(invoiceId: string) {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "ISSUED", issuedAt: new Date() },
  });
  return { success: true };
}

/**
 * Mark an invoice as paid.
 */
export async function markInvoicePaid(invoiceId: string) {
  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
    include: { deal: true },
  });

  // Move deal to WON when paid
  await db.deal.update({
    where: { id: invoice.dealId },
    data: { stage: "WON" },
  });

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice paid",
      content: `Invoice ${invoice.number} marked as paid ($${invoice.total.toLocaleString()})`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });

  return { success: true };
}

// ─── PDF / Printable Quote ──────────────────────────────────────────

export interface QuotePDFData {
  invoiceNumber: string;
  status: string;
  issuedAt: string | null;
  dealTitle: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  lineItems: { desc: string; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
}

/**
 * Generate structured data for a printable quote/invoice PDF.
 * Returns all data needed to render a quote — frontend can use
 * this with window.print(), @react-pdf/renderer, or any PDF lib.
 */
export async function generateQuotePDF(invoiceId: string): Promise<{
  success: boolean;
  data?: QuotePDFData;
  html?: string;
  error?: string;
}> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      deal: {
        include: { contact: true },
      },
    },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  const lineItems = (invoice.lineItems as { desc: string; price: number }[]) ?? [];

  const data: QuotePDFData = {
    invoiceNumber: invoice.number,
    status: invoice.status,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dealTitle: invoice.deal.title,
    contactName: invoice.deal.contact.name,
    contactEmail: invoice.deal.contact.email,
    contactPhone: invoice.deal.contact.phone,
    contactAddress: invoice.deal.contact.address,
    lineItems,
    subtotal: Number(invoice.subtotal),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    createdAt: invoice.createdAt.toISOString(),
  };

  // Generate printable HTML as fallback
  const itemRows = lineItems
    .map(
      (item, i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${i + 1}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${item.desc}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">$${item.price.toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${invoice.number}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
.header{display:flex;justify-content:space-between;margin-bottom:40px}
.badge{padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600}
.draft{background:#fef3c7;color:#92400e}.issued{background:#dbeafe;color:#1e40af}.paid{background:#dcfce7;color:#166534}
table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;padding:8px;border-bottom:2px solid #1e293b;font-weight:600}
.totals{margin-top:20px;text-align:right}.totals div{margin:4px 0}.total{font-size:20px;font-weight:700}
@media print{body{padding:20px}}</style></head>
<body>
<div class="header"><div><h1 style="margin:0">QUOTE / TAX INVOICE</h1><p style="color:#64748b">${invoice.number}</p></div>
<div style="text-align:right"><span class="badge ${invoice.status.toLowerCase()}">${invoice.status}</span>
<p style="color:#64748b;margin:8px 0 0">${new Date(invoice.createdAt).toLocaleDateString("en-AU")}</p></div></div>
<div style="margin-bottom:30px"><h3 style="margin:0 0 4px">Bill To:</h3>
<p style="margin:0">${invoice.deal.contact.name}</p>
${invoice.deal.contact.email ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.email}</p>` : ""}
${invoice.deal.contact.phone ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.phone}</p>` : ""}
${invoice.deal.contact.address ? `<p style="margin:0;color:#64748b">${invoice.deal.contact.address}</p>` : ""}</div>
<h3>Re: ${invoice.deal.title}</h3>
<table><thead><tr><th>#</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${itemRows}</tbody></table>
<div class="totals"><div>Subtotal: $${Number(invoice.subtotal).toFixed(2)}</div>
<div>GST (10%): $${Number(invoice.tax).toFixed(2)}</div>
<div class="total">Total: $${Number(invoice.total).toFixed(2)}</div></div>
</body></html>`;

  return { success: true, data, html };
}

/**
 * Complete a job with signature (moved from job-actions.ts).
 */
export async function completeJob(dealId: string, signatureDataUrl: string) {
  try {
    // Get existing metadata
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { metadata: true }
    });

    const currentMetadata = (deal?.metadata as Record<string, any>) || {};

    await db.deal.update({
      where: { id: dealId },
      data: {
        jobStatus: "COMPLETED", // Use string literal matching definition
        stage: "WON",
        metadata: {
          ...currentMetadata,
          signature: signatureDataUrl,
          completedAt: new Date().toISOString()
        }
      }
    });

    // Trigger notifications/hooks logic
    // We reuse the updateJobStatus logic's side effects effectively by manually doing them here or just letting this be standalone.
    // For parity with updateJobStatus('COMPLETED'), we should probably trigger notifications here too, 
    // but let's stick to the job-actions implementation first to just fix the build/dup issue.

    // Log the completion (using activity-actions logger pattern or direct db)
    // tradie-actions uses direct db.activity.create usually
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Job Completed",
        content: "Job signed off by client. Signature captured.",
        dealId,
        // contactId? We need to fetch it if we want to link it.
      }
    });

    revalidatePath(`/dashboard/tradie/jobs/${dealId}`);
    return { success: true };
  } catch (error) {
    console.error("Error completing job:", error);
    return { success: false, error: "Failed to complete job" };
  }
}


/**
 * Send a Google Review request SMS to the client after job completion.
 */
export async function sendReviewRequestSMS(dealId: string) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: { contact: true, workspace: true }
  });

  if (!deal || !deal.contact.phone) {
    return { success: false, error: "No contact phone number found." };
  }

  const businessName = deal.workspace.name || "our team";
  const message = `Hi ${deal.contact.name}, thanks for choosing ${businessName}! We'd love your feedback. Please leave us a quick Google review: https://g.page/${businessName.replace(/\s+/g, '')}/review — Thanks!`;

  const result = await sendSMS(deal.contactId, message, dealId);

  if (result.success) {
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Review Request Sent",
        content: `Sent Google Review request SMS to ${deal.contact.name}.`,
        dealId,
        contactId: deal.contactId
      }
    });
  }

  return result;
}
