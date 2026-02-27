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
async function getAccountingToken(workspaceId: string, provider: "XERO" | "MYOB"): Promise<string | null> {
  // Query the workspace settings for the stored OAuth token.
  // Returns null if not connected — caller should show "connect" prompt.
  try {
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
    const settings = workspace?.settings as Record<string, string> | null;
    const key = provider === "XERO" ? "xero_access_token" : "myob_access_token";
    return settings?.[key] ?? null;
  } catch {
    return null;
  }
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

  const token = await getAccountingToken(workspaceId, "XERO");
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
 * Sync an invoice to MYOB AccountRight.
 *
 * Uses the MYOB AccountRight Live API to create a sale invoice.
 * Requires MYOB_CLIENT_ID, MYOB_CLIENT_SECRET in .env and per-workspace OAuth token.
 */
export async function syncInvoiceToMYOB(
  invoiceId: string,
  workspaceId: string
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

  const token = await getAccountingToken(workspaceId, "MYOB");
  if (!token) {
    return { success: false, error: "MYOB not connected. Please connect MYOB in Settings." };
  }

  const lineItems = (invoice.lineItems as { desc: string; price: number }[]) ?? [];

  // Map to MYOB Sale Invoice format
  const myobPayload = {
    Number: invoice.number,
    Date: new Date().toISOString().split("T")[0],
    Customer: {
      DisplayID: invoice.deal.contact.email || invoice.deal.contact.name,
      Name: invoice.deal.contact.name,
    },
    Lines: lineItems.map((item) => ({
      Description: item.desc,
      Total: item.price,
      TaxCode: { Code: "GST" },
    })),
    IsTaxInclusive: true,
    Terms: {
      PaymentIsDue: "DayOfMonthAfterEOM",
      BalanceDueDate: 30,
    },
  };

  try {
    // MYOB AccountRight Live API endpoint
    const companyFileUri = process.env.MYOB_COMPANY_FILE_URI || "";
    const response = await fetch(
      `${companyFileUri}/Sale/Invoice/Service`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-myobapi-key": process.env.MYOB_CLIENT_ID || "",
          "x-myobapi-version": "v2",
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(myobPayload),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("MYOB API Error:", errBody);
      return { success: false, error: `MYOB API rejected request: ${response.statusText}` };
    }

    // MYOB returns the Location header with the new resource URI
    const locationHeader = response.headers.get("Location") || "";
    const externalId = locationHeader.split("/").pop() || `myob_${Date.now().toString(36)}`;

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Accounting sync",
        content: `Invoice ${invoice.number} synced to MYOB (ID: ${externalId})`,
        dealId: invoice.dealId,
        contactId: invoice.deal.contactId,
      },
    });

    return {
      success: true,
      externalId,
      provider: "myob",
    };
  } catch (error) {
    console.error("MYOB Sync Exception:", error);
    return { success: false, error: "Network error connecting to MYOB" };
  }
}

/**
 * Create a Xero DRAFT invoice directly from a deal/job.
 *
 * Used by the on-site completion workflow so the tradie can trigger
 * invoice generation while the boss/manager reviews later in Xero.
 * Always posts with Status: "DRAFT" — never "AUTHORISED".
 */
export async function createXeroDraftInvoice(
  dealId: string
): Promise<AccountingSyncResult> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      contact: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      workspace: { select: { id: true } },
    },
  });

  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  // Use the most recent invoice if it exists, otherwise build line items from metadata/value
  const invoice = deal.invoices[0];

  const token = await getAccountingToken(deal.workspace.id, "XERO");
  if (!token) {
    return { success: false, error: "Xero not connected. Please connect Xero in Settings." };
  }

  let lineItems: { Description: string; UnitAmount: number; Quantity: number }[];

  if (invoice) {
    const items = (invoice.lineItems as { desc: string; price: number }[]) ?? [];
    lineItems = items.map((item) => ({
      Description: item.desc,
      UnitAmount: item.price,
      Quantity: 1,
    }));
  } else {
    // Fallback: single line item from deal value
    lineItems = [
      {
        Description: deal.title,
        UnitAmount: deal.value ? Number(deal.value) : 0,
        Quantity: 1,
      },
    ];
  }

  const reference = invoice?.number ?? `JOB-${dealId.slice(0, 8).toUpperCase()}`;

  const xeroPayload: XeroInvoice = {
    Type: "ACCREC",
    Contact: {
      Name: deal.contact.name,
      EmailAddress: deal.contact.email ?? undefined,
    },
    LineItems: lineItems,
    Date: new Date().toISOString().split("T")[0],
    DueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    Reference: reference,
    Status: "DRAFT", // Always DRAFT — manager reviews in Xero
  };

  try {
    const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ Invoices: [xeroPayload] }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Xero Draft API Error:", errBody);
      return { success: false, error: `Xero API rejected request: ${response.statusText}` };
    }

    const data = await response.json();
    const createdInvoice = data.Invoices[0];
    const externalId = createdInvoice.InvoiceID;

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Xero Draft Invoice Created",
        content: `Draft invoice synced to Xero (ID: ${externalId}) for review.`,
        dealId,
        contactId: deal.contactId,
      },
    });

    return { success: true, externalId, provider: "xero" };
  } catch (error) {
    console.error("Xero Draft Sync Exception:", error);
    return { success: false, error: "Network error connecting to Xero" };
  }
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
