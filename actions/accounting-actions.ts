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

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Retrieve the stored Xero Access Token for a workspace.
 * This is a placeholder. In a real app, you would query a 'Integration' or 'Token' table.
 */
async function getXeroToken(workspaceId: string): Promise<string | null> {
  // TODO: Implement actual DB retrieval
  // const integration = await db.integration.findFirst({ where: { workspaceId, provider: 'XERO' } });
  // return integration?.accessToken ?? null;
  
  // For now, return null to trigger the "not connected" error, 
  // or return a dummy string if testing with a mock server.
  return null; 
}

// ─── Xero Sync ──────────────────────────────────────────────────────

/**
 * Sync an invoice to Xero.
 *
 * This function attempts to post the invoice to the Xero API.
 * It requires a valid OAuth2 access token to be present for the workspace.
 */
export async function syncInvoiceToXero(
  invoiceId: string,
  workspaceId: string // Added workspaceId param to fetch tokens
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

  const token = await getXeroToken(workspaceId);
  if (!token) {
    return { success: false, error: "Xero not connected. Please connect Xero in Settings." };
  }

  const lineItems = (invoice.lineItems as { desc: string; price: number }[]) ?? [];

  // Map to Xero invoice format
  const xeroPayload: XeroInvoice = {
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

  try {
    const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ Invoices: [xeroPayload] })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Xero API Error:", errBody);
      return { success: false, error: `Xero API rejected request: ${response.statusText}` };
    }

    const data = await response.json();
    const createdInvoice = data.Invoices[0];
    const externalId = createdInvoice.InvoiceID;

    // Log the sync success
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Accounting sync",
        content: `Invoice ${invoice.number} synced to Xero (ID: ${externalId})`,
        dealId: invoice.dealId,
        contactId: invoice.deal.contactId,
      },
    });

    return {
      success: true,
      externalId,
      provider: "xero",
    };

  } catch (error) {
    console.error("Xero Sync Exception:", error);
    return { success: false, error: "Network error connecting to Xero" };
  }
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
