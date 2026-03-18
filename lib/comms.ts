/**
 * VOICE ARCHITECTURE — for AI agents and developers
 * ──────────────────────────────────────────────────
 * Voice platform: LiveKit (NOT Retell — Retell was fully removed)
 *
 * Call flow:
 *   Inbound:  PSTN → Twilio number → Elastic SIP trunk → LiveKit SIP ingest
 *             → livekit-agent TypeScript microservice (/livekit-agent/agent.ts)
 *   Outbound: livekit-agent → Twilio SIP trunk → PSTN
 *
 * Agent stack (see /livekit-agent/agent.ts):
 *   STT  → Deepgram
 *   LLM  → DeepInfra (Llama-3.3-70B-Instruct via OpenAI-compatible API)
 *   TTS  → Cartesia
 *
 * Required env vars:
 *   LIVEKIT_URL          wss://your-project.livekit.cloud
 *   LIVEKIT_API_KEY      LiveKit API key
 *   LIVEKIT_API_SECRET   LiveKit API secret
 *   LIVEKIT_SIP_URI      sip: URI for the Twilio origination URL (LiveKit inbound)
 *   DEEPINFRA_API_KEY    DeepInfra API key (for LLM)
 *   DEEPGRAM_API_KEY     Deepgram API key (for STT)
 *   CARTESIA_API_KEY     Cartesia API key (for TTS)
 *
 * Legacy routes at /app/api/retell/ are kept for reference only — they receive no traffic.
 */

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone-utils";
import { twilioMasterClient, createTwilioSubaccount, getSubaccountClient } from "@/lib/twilio";
import { getExpectedSmsWebhookUrl, getExpectedVoiceGatewayUrl } from "@/lib/earlymark-inbound-config";
import { describeTwilioProvisioningError, resolveAuMobileBusinessBundleSidForAccount } from "@/lib/twilio-regulatory";
import { buildManagedVoiceNumberFriendlyName } from "@/lib/voice-number-metadata";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  /** Partial progress indicator for debugging */
  stageReached?: string;
  errorCode?: number;
  status?: number;
  bundleSid?: string;
  subaccountSid?: string;
}

type ManagedTwilioClient = NonNullable<typeof twilioMasterClient>;
type WorkspaceSubaccount = {
  subaccountId: string;
  subaccountAuthToken: string;
  reused: boolean;
};

// ─── Main Onboarding Function ───────────────────────────────────────

/**
 * Provisions dedicated telephony for a Tradie workspace:
 *
 * 1. Creates a Twilio Subaccount (isolated billing & data)
 * 2. Buys an Australian mobile (+61) number with SMS + Voice
 * 3. Creates an Elastic SIP Trunk pointing to LiveKit SIP
 * 4. Persists everything to the database
 * 5. Sends a Welcome SMS to the Tradie's mobile
 * 6. Logs every step to the Activity Feed
 *
 * Designed to be called once at the end of /setup onboarding.
 */
export async function initializeTradieComms(
  workspaceId: string,
  businessName: string,
  ownerPhone: string
): Promise<CommsSetupResult> {
  void ownerPhone;
  const livekitSipUri = process.env.LIVEKIT_SIP_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assistantbot-zeta.vercel.app";
  const expectedVoiceGatewayUrl = getExpectedVoiceGatewayUrl();
  const expectedSmsWebhookUrl = getExpectedSmsWebhookUrl();
  const managedFriendlyName = buildManagedVoiceNumberFriendlyName({
    scope: "workspace",
    surface: "normal",
    workspaceId,
    label: businessName,
  });

  if (!twilioMasterClient) {
    return { success: false, error: "Twilio credentials not configured", stageReached: "pre-check" };
  }

  if (!expectedVoiceGatewayUrl || !expectedSmsWebhookUrl) {
    return {
      success: false,
      error: "NEXT_PUBLIC_APP_URL is required to configure Twilio voice and SMS webhooks.",
      stageReached: "pre-check",
    };
  }

  let stageReached = "init";
  let purchasedNumberSid: string | null = null;
  let purchasedPhoneNumber: string | null = null;
  let trunkSid: string | null = null;
  let workspacePersisted = false;
  let cleanupWarnings: string[] = [];
  let subClient: ManagedTwilioClient | null = null;
  let bundleSid: string | null = null;
  let subaccountId: string | null = null;
  let regulatoryAddressSid: string | null = null;

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Create Twilio Subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "subaccount";
    const subaccount = await resolveWorkspaceSubaccount(workspaceId, businessName);
    subaccountId = subaccount.subaccountId;
    subClient = getSubaccountClient(subaccountId, subaccount.subaccountAuthToken);

    await logActivity(
      workspaceId,
      subaccount.reused ? "Twilio Subaccount Reused" : "Twilio Subaccount Created",
      `SID: ${subaccountId}`,
    );

    stageReached = "bundle-clone";
    bundleSid = await resolveAuMobileBusinessBundleSidForAccount({
      targetAccountSid: subaccountId,
      subaccountAuthToken: subaccount.subaccountAuthToken,
      friendlyName: `${managedFriendlyName} AU Mobile Business`,
    });

    // ────────────────────────────────────────────────────────────────
    // 2. Ensure Regulatory Address in the subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "regulatory-address";
    regulatoryAddressSid = await ensureWorkspaceRegulatoryAddress(workspaceId, subClient, businessName);

    // ────────────────────────────────────────────────────────────────
    // 3. Buy Australian +61 Number (SMS + Voice capable)
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-search";

    // Search for available AU mobile numbers with SMS + Voice.
    let chosenNumber: string | null = null;

    const mobileNumbers = await subClient.availablePhoneNumbers("AU")
      .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

    if (mobileNumbers.length > 0) {
      chosenNumber = mobileNumbers[0].phoneNumber;
    }

    if (!chosenNumber) {
      await logActivity(
        workspaceId,
        "Phone Number Provisioning Failed",
        "No Australian mobile numbers available with SMS + Voice. Will retry or escalate."
      );
      return {
        success: false,
        error: "No Australian mobile numbers available with SMS + Voice capability",
        stageReached: "number-search",
        bundleSid: bundleSid ?? undefined,
        subaccountSid: subaccountId ?? undefined,
      };
    }

    stageReached = "number-purchase";

    const purchasedNumber = await subClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: managedFriendlyName,
      bundleSid,
      addressSid: regulatoryAddressSid ?? undefined,
    });
    purchasedNumberSid = purchasedNumber.sid;
    purchasedPhoneNumber = purchasedNumber.phoneNumber;

    await logActivity(
      workspaceId,
      "Phone Number Purchased",
      `Number: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`
    );

    // ────────────────────────────────────────────────────────────────
    // 3. Create Elastic SIP Trunk for LiveKit Voice Agent
    // ────────────────────────────────────────────────────────────────
    stageReached = "sip-trunk";

    const trunk = await subClient.trunking.v1.trunks.create({
      friendlyName: `${businessName} - LiveKit SIP`,
    });
    trunkSid = trunk.sid;

    // Add an origination URI so LiveKit can route inbound calls
    if (livekitSipUri) {
      await subClient.trunking.v1
        .trunks(trunk.sid)
        .originationUrls.create({
          friendlyName: "LiveKit Inbound",
          sipUrl: livekitSipUri,
          priority: 1,
          weight: 1,
          enabled: true,
        });
    }

    // Build the termination URI (subaccount SID-based)
    const terminationUri = `${subaccountId}.pstn.twilio.com`;
    stageReached = "number-config";
    await subClient.incomingPhoneNumbers(purchasedNumber.sid).update({
      voiceUrl: expectedVoiceGatewayUrl,
      voiceMethod: "POST",
      voiceApplicationSid: "",
      smsUrl: expectedSmsWebhookUrl,
      smsMethod: "POST",
      smsApplicationSid: "",
      friendlyName: managedFriendlyName,
    });

    await logActivity(
      workspaceId,
      "SIP Trunk Configured",
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}${livekitSipUri ? `, LiveKit SIP: ${livekitSipUri}` : ""}, Voice gateway: ${expectedVoiceGatewayUrl}, SMS webhook: ${expectedSmsWebhookUrl}`
    );

    // ────────────────────────────────────────────────────────────────
    // 4. Persist Everything to Database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: subaccountId,
        twilioSubaccountAuthToken: subaccount.subaccountAuthToken,
        twilioPhoneNumber: purchasedNumber.phoneNumber,
        twilioPhoneNumberNormalized: normalizePhone(purchasedNumber.phoneNumber),
        twilioPhoneNumberSid: purchasedNumber.sid,
        twilioSipTrunkSid: trunk.sid,
      },
    });
    workspacePersisted = true;

    await logActivity(
      workspaceId,
      "LiveKit Voice Agent Connected",
      `Number ${purchasedNumber.phoneNumber} now routes through the voice gateway before LiveKit.`
    );

    // ────────────────────────────────────────────────────────────────
    // 5. Create UsageTrigger (Billing Circuit Breaker)
    // ────────────────────────────────────────────────────────────────
    stageReached = "usage-trigger";

    try {
      await subClient.usage.triggers.create({
        friendlyName: `${businessName} daily limit`,
        usageCategory: 'totalprice',
        triggerBy: 'price',
        triggerValue: '50.00',
        recurring: 'daily',
        callbackUrl: `${appUrl}/api/webhooks/twilio-usage`,
        callbackMethod: 'POST',
      });
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Active",
        "Voice calls will automatically disable if daily Twilio spend exceeds $50 to prevent unexpected charges."
      );
    } catch (triggerErr) {
      console.error("[initializeTradieComms] Usage trigger creation failed:", triggerErr);
      // Non-fatal, just log and continue
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Warning",
        "Failed to configure the $50 daily limit trigger automatically. Please contact support."
      );
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Send Welcome SMS to the Tradie
    // ────────────────────────────────────────────────────────────────
    stageReached = "complete";
    await logActivity(
      workspaceId,
      "Comms Setup Complete",
      `${businessName} is fully provisioned with number ${purchasedNumber.phoneNumber}`
    );

    return {
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      stageReached: "complete",
      bundleSid: bundleSid ?? undefined,
      subaccountSid: subaccountId ?? undefined,
    };
  } catch (error) {
    const { detailedError, code: errorCode, status } = describeTwilioProvisioningError(error);
    if (!workspacePersisted && (purchasedNumberSid || trunkSid)) {
      cleanupWarnings = await cleanupProvisioningArtifacts({
        client: subClient || twilioMasterClient,
        workspaceId,
        phoneNumberSid: purchasedNumberSid,
        phoneNumber: purchasedPhoneNumber,
        trunkSid,
      });
    }

    console.error(`[initializeTradieComms] Failed at stage '${stageReached}':`, error, {
      bundleSid,
      cleanupWarnings,
    });

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Error at stage '${stageReached}': ${detailedError}${cleanupWarnings.length > 0 ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : ""}`
    ).catch(() => { }); // Don't let logging failure mask the real error

    return {
      success: false,
      error: detailedError,
      stageReached,
      errorCode,
      status,
      bundleSid: bundleSid ?? undefined,
      subaccountSid: subaccountId ?? undefined,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function logActivity(workspaceId: string, title: string, content: string) {
  await db.activity.create({
    data: {
      type: "NOTE",
      title,
      content,
      // No dealId/contactId — this is a system-level workspace event
    },
  });
}

async function resolveWorkspaceSubaccount(workspaceId: string, businessName: string): Promise<WorkspaceSubaccount> {
  const masterAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} was not found before Twilio provisioning started.`);
  }

  if (workspace.twilioSubaccountId && workspace.twilioSubaccountId !== masterAccountSid) {
    if (!workspace.twilioSubaccountAuthToken) {
      throw new Error(
        `Workspace ${workspaceId} already has Twilio subaccount ${workspace.twilioSubaccountId} but no auth token is stored for retry provisioning.`,
      );
    }

    return {
      subaccountId: workspace.twilioSubaccountId,
      subaccountAuthToken: workspace.twilioSubaccountAuthToken,
      reused: true,
    };
  }

  const subaccount = await createTwilioSubaccount(businessName, { workspaceId });
  if (!subaccount) {
    throw new Error("Failed to create Twilio subaccount");
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      twilioSubaccountId: subaccount.subaccountId,
      twilioSubaccountAuthToken: subaccount.subaccountAuthToken,
    },
  });

  return {
    ...subaccount,
    reused: false,
  };
}

/**
 * Server-side geocoding via Google Geocoding API.
 * Resolves a free-text AU address into structured components.
 *
 * Uses the app URL as Referer header so referrer-restricted keys still work.
 */
async function geocodeAuAddress(rawAddress: string): Promise<{
  street: string;
  city: string;
  region: string;
  postalCode: string;
} | null> {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();
  if (!apiKey) return null;

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    ""
  ).trim();

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", rawAddress);
  url.searchParams.set("region", "au");
  url.searchParams.set("components", "country:AU");
  url.searchParams.set("key", apiKey);

  const headers: Record<string, string> = {};
  if (appUrl) headers["Referer"] = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;

  const resp = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) {
    console.error(`[geocodeAuAddress] HTTP ${resp.status} for "${rawAddress}"`);
    return null;
  }
  const data = await resp.json();
  if (data.status !== "OK" || !data.results?.length) {
    console.error(`[geocodeAuAddress] status=${data.status}, error=${data.error_message ?? "none"} for "${rawAddress}"`);
    return null;
  }

  const components: Array<{ long_name: string; short_name: string; types: string[] }> =
    data.results[0].address_components ?? [];

  const get = (type: string) => components.find((c: { types: string[] }) => c.types.includes(type));

  const streetNumber = get("street_number")?.long_name ?? "";
  const route = get("route")?.long_name ?? "";
  const city =
    get("locality")?.long_name ??
    get("postal_town")?.long_name ??
    get("sublocality")?.long_name ??
    "";
  const region = get("administrative_area_level_1")?.short_name ?? "";
  const postalCode = get("postal_code")?.long_name ?? "";

  if (!city || !region || !postalCode) return null;

  const street = streetNumber && route ? `${streetNumber} ${route}` : rawAddress.split(",")[0]?.trim() ?? rawAddress;

  return { street, city, region, postalCode };
}

const AU_STATE_ABBREVS: Record<string, string> = {
  "new south wales": "NSW",
  "victoria": "VIC",
  "queensland": "QLD",
  "western australia": "WA",
  "south australia": "SA",
  "tasmania": "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
};

async function ensureWorkspaceRegulatoryAddress(
  workspaceId: string,
  subClient: ManagedTwilioClient,
  businessName: string,
): Promise<string> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      twilioRegulatoryAddressSid: true,
      location: true,
      settings: true,
      ownerId: true,
    },
  });
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} was not found before creating a regulatory address.`);
  }

  if (workspace.twilioRegulatoryAddressSid) {
    return workspace.twilioRegulatoryAddressSid;
  }

  const parseAuRegionPostcode = (input: string | null | undefined) => {
    if (!input) return { region: undefined as string | undefined, postalCode: undefined as string | undefined };
    // Match abbreviated state + postcode: "NSW 2015"
    const abbrevMatch = input.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b\s*(\d{4})\b/i);
    if (abbrevMatch) return { region: abbrevMatch[1].toUpperCase(), postalCode: abbrevMatch[2] };
    // Match full state name: "New South Wales" -> "NSW"
    for (const [full, abbr] of Object.entries(AU_STATE_ABBREVS)) {
      if (input.toLowerCase().includes(full)) {
        const pcMatch = input.match(/\b(\d{4})\b/);
        return { region: abbr, postalCode: pcMatch?.[1] };
      }
    }
    return { region: undefined, postalCode: undefined };
  };

  const deriveCityFromAddress = (input: string | null | undefined) => {
    if (!input) return "";
    // Strategy 1: "Alexandria NSW 2015"
    const abbrevMatch = input.match(/,\s*([^,]+)\s+(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}/i);
    if (abbrevMatch?.[1]?.trim()) return abbrevMatch[1].trim();
    // Strategy 2: "Alexandria, New South Wales, Australia"
    for (const full of Object.keys(AU_STATE_ABBREVS)) {
      const re = new RegExp(`,\\s*([^,]+?)[,\\s]+${full.replace(/ /g, "\\s+")}`, "i");
      const m = input.match(re);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    // Strategy 3: second comma-separated segment as locality
    // e.g. "36-42 Henderson Road, Alexandria, ..." → "Alexandria"
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const candidate = parts[1];
      if (candidate && candidate.length > 1 && candidate.length < 40) return candidate;
    }
    return "";
  };

  let street = workspace.location || "";
  let city = "";
  let region: string | undefined;
  let postalCode: string | undefined;

  try {
    if (workspace.ownerId) {
      const owner = await db.user.findUnique({
        where: { id: workspace.ownerId },
        select: {
          businessProfile: {
            select: {
              physicalAddress: true,
              baseSuburb: true,
            },
          },
        },
      });
      const profile = owner?.businessProfile;
      const physicalAddress = profile?.physicalAddress;
      const baseSuburb = profile?.baseSuburb;

      console.log(`[regulatory-address] physicalAddress=${JSON.stringify(physicalAddress)}, baseSuburb=${JSON.stringify(baseSuburb)}, workspaceLocation=${JSON.stringify(workspace.location)}`);

      if (physicalAddress && physicalAddress.trim().length > 0) {
        // Extract just the street portion (before the first comma)
        const parts = physicalAddress.split(",").map((s) => s.trim()).filter(Boolean);
        street = parts[0] || physicalAddress.trim();
        const parsed = parseAuRegionPostcode(physicalAddress);
        region = parsed.region;
        postalCode = parsed.postalCode;
        city = deriveCityFromAddress(physicalAddress);
        console.log(`[regulatory-address] local parse: street=${JSON.stringify(street)}, city=${JSON.stringify(city)}, region=${JSON.stringify(region)}, postalCode=${JSON.stringify(postalCode)}`);
      }
      if (!city && baseSuburb && baseSuburb.trim().length > 0) {
        city = baseSuburb.trim();
        console.log(`[regulatory-address] using baseSuburb as city: ${JSON.stringify(city)}`);
      }

      // If local parsing couldn't get all components, use Google Geocoding API
      if (!city || !region || !postalCode) {
        const source = (physicalAddress || workspace.location || "").trim();
        if (source) {
          try {
            console.log(`[regulatory-address] geocoding fallback for: ${JSON.stringify(source)}`);
            const geo = await geocodeAuAddress(source);
            console.log(`[regulatory-address] geocode result: ${JSON.stringify(geo)}`);
            if (geo) {
              if (!city) city = geo.city;
              if (!region) region = geo.region;
              if (!postalCode) postalCode = geo.postalCode;
              street = geo.street;
            }
          } catch (geoErr) {
            console.error(`[regulatory-address] geocoding error:`, geoErr);
          }
        }
      }
    } else {
      console.warn(`[regulatory-address] workspace ${workspaceId} has no ownerId`);
    }
  } catch (outerErr) {
    console.error(`[regulatory-address] outer error:`, outerErr);
  }

  console.log(`[regulatory-address] final: city=${JSON.stringify(city)}, region=${JSON.stringify(region)}, postalCode=${JSON.stringify(postalCode)}, street=${JSON.stringify(street)}`);

  if (!city) {
    throw new Error(
      `Could not determine the city/locality from your address "${street}". Please update your Physical Address to include a suburb (e.g. '123 Trade St, Alexandria NSW 2015').`,
    );
  }

  if (!region || !postalCode) {
    throw new Error(
      `Could not determine state/postcode from your address "${street}". Please update your Physical Address (e.g. 'Alexandria NSW 2015').`,
    );
  }

  const addressPayload = {
    friendlyName: `${businessName} AU Mobile Business`,
    customerName: businessName,
    street,
    city,
    region,
    postalCode,
    isoCountry: "AU",
    autoCorrectAddress: true,
  };
  console.log(`[regulatory-address] Twilio addresses.create payload:`, JSON.stringify(addressPayload));

  let address: any;
  try {
    address = await (subClient as any).addresses.create(addressPayload);
  } catch (twilioErr: any) {
    console.error(`[regulatory-address] Twilio addresses.create failed:`, {
      message: twilioErr?.message,
      code: twilioErr?.code,
      status: twilioErr?.status,
      moreInfo: twilioErr?.moreInfo,
    });
    throw new Error(
      twilioErr?.message || "The address you have provided cannot be validated.",
    );
  }

  const addressSid: string =
    (address && typeof (address as any).sid === "string" ? (address as any).sid : null) ??
    (() => {
      throw new Error("Twilio returned an unexpected response when creating regulatory address.");
    })();

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      twilioRegulatoryAddressSid: addressSid,
    },
  });

  await logActivity(
    workspaceId,
    "Regulatory Address Created",
    `Regulatory address ${addressSid} was created in the Twilio subaccount for AU mobile provisioning.`,
  );

  return addressSid;
}

async function cleanupProvisioningArtifacts(params: {
  client: ManagedTwilioClient;
  workspaceId: string;
  phoneNumberSid?: string | null;
  phoneNumber?: string | null;
  trunkSid?: string | null;
}) {
  const warnings: string[] = [];

  if (params.phoneNumberSid) {
    try {
      await params.client.incomingPhoneNumbers(params.phoneNumberSid).remove();
    } catch (error) {
      warnings.push(
        `Failed to release purchased number ${params.phoneNumber || params.phoneNumberSid}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (params.trunkSid) {
    try {
      await params.client.trunking.v1.trunks(params.trunkSid).remove();
    } catch (error) {
      warnings.push(
        `Failed to remove SIP trunk ${params.trunkSid}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (warnings.length > 0) {
    await logActivity(params.workspaceId, "Comms Cleanup Warning", warnings.join(" ")).catch(() => { });
  }

  return warnings;
}
