"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface AccountingSyncResult {
  success: boolean;
  externalId?: string;
  provider?: string;
  error?: string;
}

interface XeroInvoice {
  Type: "ACCREC";
  Contact: { Name: string; EmailAddress?: string };
  LineItems: { Description: string; UnitAmount: number; Quantity: number }[];
  Date: string;
  DueDate: string;
  Reference: string;
  Status: "DRAFT" | "SUBMITTED" | "AUTHORISED";
}

// ─── Xero Sync ──────────────────────────────────────────────────────

/**
 * Sync an invoice to Xero.
 *
 * STUB: In production, this would:
 * 1. Use OAuth2 token from workspace settings
 * 2. Map Invoice model → Xero invoice schema
 * 3. POST to Xero API
 * 4. Store the external Xero invoice ID in metadata
 *
 * Requires XERO_CLIENT_ID, XERO_CLIENT_SECRET, and per-workspace OAuth tokens.
 */
export async function syncInvoiceToXero(
  invoiceId: string
): Promise<AccountingSyncResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      deal: { include: { contact: true } },
    },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  const lineItems = (invoice.lineItems as { desc: string; price: number }[]) ?? [];

  // Map to Xero invoice format
  const _xeroPayload: XeroInvoice = {
    Type: "ACCREC",
    Contact: {
      Name: invoice.deal.contact.name,
      EmailAddress: invoice.deal.contact.email ?? undefined,
    },
    LineItems: lineItems.map((item) => ({
      Description: item.desc,
      UnitAmount: item.price,
      Quantity: 1,
    })),
    Date: new Date().toISOString().split("T")[0],
    DueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    Reference: invoice.number,
    Status: invoice.status === "DRAFT" ? "DRAFT" : "AUTHORISED",
  };

  // TODO: Replace with actual Xero API call
  // const xeroClient = await getXeroClient(workspaceId);
  // const response = await xeroClient.accountingApi.createInvoices(tenantId, { Invoices: [xeroPayload] });
  // const externalId = response.body.Invoices[0].InvoiceID;

  // For now, return a stub response
  const stubExternalId = `xero_${Date.now().toString(36)}`;

  // Log the sync attempt
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Accounting sync",
      content: `Invoice ${invoice.number} synced to Xero (stub: ${stubExternalId})`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });

  return {
    success: true,
    externalId: stubExternalId,
    provider: "xero",
  };
}

/**
 * Sync an invoice to MYOB.
 *
 * STUB: Same approach as Xero but with MYOB AccountRight API.
 */
export async function syncInvoiceToMYOB(
  invoiceId: string
): Promise<AccountingSyncResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      deal: { include: { contact: true } },
    },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  // TODO: Replace with actual MYOB API call
  const stubExternalId = `myob_${Date.now().toString(36)}`;

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Accounting sync",
      content: `Invoice ${invoice.number} synced to MYOB (stub: ${stubExternalId})`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });

  return {
    success: true,
    externalId: stubExternalId,
    provider: "myob",
  };
}

/**
 * Get sync status for an invoice.
 * Checks metadata for external accounting system IDs.
 */
export async function getInvoiceSyncStatus(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) return null;

  return {
    invoiceId: invoice.id,
    number: invoice.number,
    status: invoice.status,
    // In production, would check metadata for xero_id / myob_id
    synced: false,
    provider: null,
    externalId: null,
  };
}
