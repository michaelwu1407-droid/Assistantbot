import { twilioMasterClient } from "@/lib/twilio";

const MASTER_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
const AU_MOBILE_BUSINESS_BUNDLE_SID = process.env.TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID?.trim() || "";
const bundleCloneCache = new Map<string, Promise<string>>();

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
  friendlyName?: string;
}) {
  const sourceBundleSid = requireAuMobileBusinessBundleSid();
  const targetAccountSid = params.targetAccountSid?.trim() || MASTER_ACCOUNT_SID;

  if (!targetAccountSid || targetAccountSid === MASTER_ACCOUNT_SID) {
    return sourceBundleSid;
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
    .then((clone) => clone.bundleSid || sourceBundleSid)
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

export function describeTwilioProvisioningError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorData = (error ?? null) as TwilioErrorLike | null;
  const code = errorData?.code;
  const status = errorData?.status;

  let detailedError = message;
  if (code === 21649 || code === 21631) {
    detailedError =
      "AUSTRALIAN REGULATORY BUNDLE REQUIRED: This Twilio purchase request needs a valid Australia Mobile Business bundle. Confirm TWILIO_AU_MOBILE_BUSINESS_BUNDLE_SID points to your approved bundle and that the bundle is available to the target subaccount.";
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
