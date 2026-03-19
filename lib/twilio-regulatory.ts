import twilio from "twilio";

import { twilioMasterClient } from "@/lib/twilio";

const MASTER_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
const MASTER_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
const AU_MOBILE_BUSINESS_BUNDLE_SID = process.env.TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID?.trim() || "";
const bundleCloneCache = new Map<string, Promise<{ bundleSid: string; addressSid: string | null }>>();
const BUNDLE_READY_POLL_ATTEMPTS = 10;
const BUNDLE_READY_POLL_DELAY_MS = 3000;

type TwilioErrorLike = {
  code?: number;
  status?: number;
  message?: string;
};

export function getConfiguredAuMobileBusinessBundleSid() {
  return AU_MOBILE_BUSINESS_BUNDLE_SID || null;
}

export function requireAuMobileBusinessBundleSid() {
  if (!AU_MOBILE_BUSINESS_BUNDLE_SID) {
    throw new Error(
      "TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID is required for AU mobile provisioning. Set it to your approved Australia: Mobile - Business bundle SID in the deployment environment.",
    );
  }

  return AU_MOBILE_BUSINESS_BUNDLE_SID;
}

export async function resolveAuMobileBusinessBundleSidForAccount(params: {
  targetAccountSid?: string | null;
  subaccountAuthToken?: string | null;
  friendlyName?: string;
}): Promise<{ bundleSid: string; addressSid: string | null }> {
  const sourceBundleSid = requireAuMobileBusinessBundleSid();
  const targetAccountSid = params.targetAccountSid?.trim() || MASTER_ACCOUNT_SID;

  if (!targetAccountSid || targetAccountSid === MASTER_ACCOUNT_SID) {
    return { bundleSid: sourceBundleSid, addressSid: null };
  }

  if (!twilioMasterClient) {
    throw new Error("Twilio credentials are required before cloning a regulatory bundle into a subaccount.");
  }

  const cacheKey = `${sourceBundleSid}:${targetAccountSid}`;
  const existing = bundleCloneCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const clonePromise = twilioMasterClient.numbers.v2
    .bundleClone(sourceBundleSid)
    .create({
      targetAccountSid,
      friendlyName: params.friendlyName,
    })
    .then(async (clone) => {
      const cloneRecord = clone as unknown as Record<string, unknown>;
      const clonedBundleSid =
        (typeof cloneRecord.bundleSid === "string" ? cloneRecord.bundleSid : null) ||
        (typeof cloneRecord.sid === "string" ? cloneRecord.sid : null) ||
        sourceBundleSid;
      await waitForBundleReady({
        targetAccountSid,
        bundleSid: clonedBundleSid,
        subaccountAuthToken: params.subaccountAuthToken || null,
      });

      const addressSid = await extractAddressSidFromBundle({
        targetAccountSid,
        subaccountAuthToken: params.subaccountAuthToken || null,
        bundleSid: clonedBundleSid,
      });

      return { bundleSid: clonedBundleSid, addressSid };
    })
    .catch((error: unknown) => {
      bundleCloneCache.delete(cacheKey);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to clone AU mobile business bundle ${sourceBundleSid} into subaccount ${targetAccountSid}: ${message}`,
      );
    });

  bundleCloneCache.set(cacheKey, clonePromise);
  return clonePromise;
}

/**
 * Reads the ItemAssignments of a cloned bundle to find the address (AD...)
 * that was cloned with it. This is the address Twilio expects when purchasing
 * a number with that bundle — a separately created address will be rejected
 * with "Address not contained in bundle".
 */
async function extractAddressSidFromBundle(params: {
  targetAccountSid: string;
  subaccountAuthToken: string | null;
  bundleSid: string;
}): Promise<string | null> {
  const hasSubaccountCreds = Boolean(params.subaccountAuthToken && params.targetAccountSid);
  const client = hasSubaccountCreds
    ? twilio(params.targetAccountSid, params.subaccountAuthToken as string)
    : twilio(MASTER_ACCOUNT_SID, MASTER_AUTH_TOKEN);

  try {
    const items = await client.numbers.v2.regulatoryCompliance
      .bundles(params.bundleSid)
      .itemAssignments.list();

    const addressItem = items.find((item) => {
      const record = item as unknown as Record<string, unknown>;
      const objectSid = record.objectSid ?? record.object_sid;
      return typeof objectSid === "string" && objectSid.startsWith("AD");
    });

    if (addressItem) {
      const record = addressItem as unknown as Record<string, unknown>;
      const sid = (record.objectSid ?? record.object_sid) as string;
      console.log(`[regulatory-bundle] found address ${sid} inside bundle ${params.bundleSid}`);
      return sid;
    }

    console.warn(`[regulatory-bundle] no address found in bundle ${params.bundleSid} item assignments`);
    return null;
  } catch (err) {
    console.warn(`[regulatory-bundle] failed to read item assignments for ${params.bundleSid}:`, err);
    return null;
  }
}

async function waitForBundleReady(params: { targetAccountSid: string; bundleSid: string; subaccountAuthToken: string | null }) {
  const hasSubaccountCreds = Boolean(params.subaccountAuthToken && params.targetAccountSid);
  if (!hasSubaccountCreds && (!MASTER_ACCOUNT_SID || !MASTER_AUTH_TOKEN)) {
    throw new Error("Twilio credentials are required before polling a cloned bundle.");
  }

  const targetClient = hasSubaccountCreds
    ? twilio(params.targetAccountSid, params.subaccountAuthToken as string)
    : twilio(MASTER_ACCOUNT_SID, MASTER_AUTH_TOKEN);

  let lastStatus = "unknown";
  let lastError: string | null = null;

  for (let attempt = 0; attempt < BUNDLE_READY_POLL_ATTEMPTS; attempt += 1) {
    try {
      const bundle = await targetClient.numbers.v2.regulatoryCompliance
        .bundles(params.bundleSid)
        .fetch();
      lastStatus = String(bundle.status || "unknown").toLowerCase();

      if (isReadyBundleStatus(lastStatus)) {
        return;
      }

      if (isRejectedBundleStatus(lastStatus)) {
        throw new Error(
          `Cloned AU mobile business bundle ${params.bundleSid} was rejected in subaccount ${params.targetAccountSid} with status '${bundle.status}'.`,
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      if (lastError.toLowerCase().includes("rejected")) {
        throw error;
      }
    }

    await delay(BUNDLE_READY_POLL_DELAY_MS);
  }

  throw new Error(
    `Timed out waiting for AU mobile business bundle ${params.bundleSid} to become usable in subaccount ${params.targetAccountSid}. Last status='${lastStatus}'${lastError ? `, lastError='${lastError}'` : ""}.`,
  );
}

function isReadyBundleStatus(status: string) {
  return status === "twilio-approved" || status === "approved";
}

function isRejectedBundleStatus(status: string) {
  return status === "twilio-rejected" || status === "rejected";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function describeTwilioProvisioningError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorData = (error ?? null) as TwilioErrorLike | null;
  const code = errorData?.code;
  const status = errorData?.status;

  let detailedError = message;
  if (code === 21649) {
    detailedError =
      "AUSTRALIAN REGULATORY BUNDLE REQUIRED: This Twilio purchase request needs a valid Australia Mobile Business bundle. Confirm TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID points to your approved bundle and that the bundle is available to the target subaccount.";
  } else if (code === 21631) {
    detailedError =
      "AU NUMBER REQUIRES ADDRESS: Twilio requires an AddressSid for this number type. The address must be one contained in the regulatory bundle. Check that the bundle clone includes an address in its ItemAssignments.";
  } else if (code === 20003) {
    detailedError =
      "PERMISSION DENIED: Your Twilio account lacks permissions for Australian number inventory. Check account permissions and geographic restrictions.";
  } else if (code === 21452) {
    detailedError =
      "INSUFFICIENT FUNDS: Twilio account balance too low to purchase phone number. Add funds to your Twilio account.";
  } else if (status === 401) {
    detailedError =
      "AUTHENTICATION FAILED: Invalid Twilio credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the deployment environment.";
  } else if (status === 403) {
    detailedError =
      "ACCESS FORBIDDEN: Account may be suspended or trial limitations apply. Check Twilio account status.";
  }

  return { message, detailedError, code, status };
}
