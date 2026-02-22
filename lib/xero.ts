import { db } from "@/lib/db";

// ─── Constants ───────────────────────────────────────────────────────

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";

// ─── Token Encryption ────────────────────────────────────────────────
// Simple AES-256-CBC encryption for storing OAuth tokens at rest.
// In production, consider using a KMS (AWS KMS, GCP KMS, etc.).

function getEncryptionKey(): Buffer {
  // Derive a 32-byte key from XERO_CLIENT_SECRET (or a dedicated TOKEN_ENCRYPTION_KEY)
  const secret = process.env.TOKEN_ENCRYPTION_KEY ?? process.env.XERO_CLIENT_SECRET ?? "";
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(encrypted: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  const [ivHex, data] = encrypted.split(":");
  if (!ivHex || !data) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── Token Management ────────────────────────────────────────────────

interface XeroTokens {
  xero_access_token: string;
  xero_refresh_token: string;
  xero_token_expiry: string;
  xero_tenant_id: string;
}

/**
 * Store encrypted Xero tokens in the workspace settings JSON.
 */
export async function storeXeroTokens(
  workspaceId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number; tenant_id: string }
) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const existingSettings = (workspace?.settings as Record<string, unknown>) ?? {};

  const xeroData: XeroTokens = {
    xero_access_token: encryptToken(tokens.access_token),
    xero_refresh_token: encryptToken(tokens.refresh_token),
    xero_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    xero_tenant_id: tokens.tenant_id,
  };

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: JSON.parse(JSON.stringify({ ...existingSettings, ...xeroData })),
    },
  });
}

/**
 * Retrieve and decrypt the Xero access token for a workspace.
 * Automatically refreshes if expired.
 */
export async function getXeroAccessToken(
  workspaceId: string
): Promise<{ accessToken: string; tenantId: string } | null> {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const settings = workspace?.settings as Record<string, string> | null;

  if (!settings?.xero_access_token || !settings?.xero_refresh_token) {
    return null;
  }

  const expiry = new Date(settings.xero_token_expiry ?? 0);
  const tenantId = settings.xero_tenant_id ?? "";

  // If token is still valid (with 60s buffer), return it directly
  if (expiry.getTime() > Date.now() + 60_000) {
    return {
      accessToken: decryptToken(settings.xero_access_token),
      tenantId,
    };
  }

  // Token expired — refresh it
  const refreshToken = decryptToken(settings.xero_refresh_token);
  const clientId = process.env.XERO_CLIENT_ID ?? "";
  const clientSecret = process.env.XERO_CLIENT_SECRET ?? "";

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("[xero] Token refresh failed:", await res.text());
    return null;
  }

  const tokens = await res.json();

  // Store the refreshed tokens
  await storeXeroTokens(workspaceId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    tenant_id: tenantId,
  });

  return { accessToken: tokens.access_token, tenantId };
}

// ─── Xero Contact Management ────────────────────────────────────────

/**
 * Find or create a Xero Contact for the given customer.
 */
async function findOrCreateXeroContact(
  accessToken: string,
  tenantId: string,
  contact: { name: string; email?: string | null; phone?: string | null }
): Promise<string> {
  // Search by name first
  const searchRes = await fetch(
    `${XERO_API_BASE}/Contacts?where=Name=="${encodeURIComponent(contact.name)}"`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-Tenant-Id": tenantId,
        Accept: "application/json",
      },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.Contacts?.length > 0) {
      return data.Contacts[0].ContactID;
    }
  }

  // Contact not found — create them
  const createRes = await fetch(`${XERO_API_BASE}/Contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      Contacts: [
        {
          Name: contact.name,
          EmailAddress: contact.email ?? undefined,
          Phones: contact.phone
            ? [{ PhoneType: "MOBILE", PhoneNumber: contact.phone }]
            : [],
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Xero contact: ${err}`);
  }

  const createData = await createRes.json();
  return createData.Contacts[0].ContactID;
}

// ─── Draft Invoice Creation ──────────────────────────────────────────

export interface XeroDraftResult {
  success: boolean;
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  error?: string;
}

/**
 * Creates a Draft Invoice in Xero for a given Job (Deal).
 *
 * 1. Finds the customer (Contact) in Xero or creates them
 * 2. Builds line items from the deal metadata (Gemini-generated quote)
 * 3. Posts a DRAFT invoice to Xero
 * 4. Logs the result in the Activity Feed
 */
export async function createXeroDraftInvoice(jobId: string): Promise<XeroDraftResult> {
  // Fetch the deal with contact and workspace info
  const deal = await db.deal.findUnique({
    where: { id: jobId },
    include: {
      contact: true,
      workspace: { select: { id: true, name: true, callOutFee: true } },
    },
  });

  if (!deal) {
    return { success: false, error: "Job not found" };
  }

  // Get valid Xero credentials
  const xero = await getXeroAccessToken(deal.workspaceId);
  if (!xero) {
    return {
      success: false,
      error: "Xero not connected. Please connect Xero in Settings → Integrations.",
    };
  }

  const { accessToken, tenantId } = xero;

  try {
    // 1. Find or create the customer in Xero
    const xeroContactId = await findOrCreateXeroContact(accessToken, tenantId, {
      name: deal.contact.name,
      email: deal.contact.email,
      phone: deal.contact.phone,
    });

    // 2. Build line items from deal metadata
    //    The metadata may contain a Gemini-generated quote with line items
    const metadata = (deal.metadata as Record<string, unknown>) ?? {};
    const quoteItems = (metadata.quoteLineItems ?? metadata.lineItems) as
      | { description: string; amount: number; quantity?: number }[]
      | undefined;

    let lineItems;
    if (quoteItems && Array.isArray(quoteItems) && quoteItems.length > 0) {
      lineItems = quoteItems.map((item) => ({
        Description: item.description,
        UnitAmount: item.amount,
        Quantity: item.quantity ?? 1,
        AccountCode: "200", // Default revenue account
      }));
    } else {
      // Fallback: single line item from deal value
      const callOutFee = deal.workspace.callOutFee
        ? Number(deal.workspace.callOutFee)
        : 0;
      const amount = deal.value ? Number(deal.value) : callOutFee;

      lineItems = [
        {
          Description: deal.title,
          UnitAmount: amount,
          Quantity: 1,
          AccountCode: "200",
        },
      ];
    }

    // 3. Create Draft Invoice in Xero
    const invoicePayload = {
      Invoices: [
        {
          Type: "ACCREC",
          Contact: { ContactID: xeroContactId },
          LineItems: lineItems,
          Date: new Date().toISOString().split("T")[0],
          DueDate: new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .split("T")[0],
          Reference: `Job: ${deal.title}`,
          Status: "DRAFT",
          LineAmountTypes: "Exclusive",
        },
      ],
    };

    const invoiceRes = await fetch(`${XERO_API_BASE}/Invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-Tenant-Id": tenantId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!invoiceRes.ok) {
      const errBody = await invoiceRes.text();
      console.error("[xero] Invoice creation failed:", errBody);
      return { success: false, error: `Xero API error: ${invoiceRes.statusText}` };
    }

    const invoiceData = await invoiceRes.json();
    const created = invoiceData.Invoices?.[0];
    const xeroInvoiceId = created?.InvoiceID ?? "";
    const xeroInvoiceNumber = created?.InvoiceNumber ?? "";

    // 4. Log in the Activity Feed
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Xero draft invoice created",
        content: `Draft invoice ${xeroInvoiceNumber} created in Xero for ${deal.contact.name}. Total: $${lineItems.reduce((sum, li) => sum + li.UnitAmount * li.Quantity, 0).toFixed(2)}`,
        description: `Xero Invoice ID: ${xeroInvoiceId}`,
        dealId: deal.id,
        contactId: deal.contactId,
      },
    });

    return {
      success: true,
      xeroInvoiceId,
      xeroInvoiceNumber,
    };
  } catch (error) {
    console.error("[xero] Draft invoice error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating Xero invoice",
    };
  }
}

// ─── OAuth URL Builder ───────────────────────────────────────────────

/**
 * Generate the Xero OAuth 2.0 authorization URL.
 */
export function buildXeroAuthUrl(workspaceId: string): string {
  const clientId = process.env.XERO_CLIENT_ID ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/xero/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.transactions accounting.contacts offline_access",
    state: workspaceId,
  });

  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
}
