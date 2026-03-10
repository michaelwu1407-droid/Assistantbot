import { db } from "@/lib/db";
import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers, phoneMatches } from "@/lib/earlymark-inbound-config";
import { normalizePhone } from "@/lib/phone-utils";
import type { VoiceSurface } from "@/lib/voice-fleet";
import { parseManagedSubaccountFriendlyName, parseManagedVoiceNumberFriendlyName, buildManagedVoiceNumberFriendlyName } from "@/lib/voice-number-metadata";

export type RuntimeStatus = "healthy" | "degraded" | "unhealthy";

export type VoiceNumberDriftRecord = {
  scope: "workspace" | "earlymark" | "orphaned";
  label: string;
  phoneNumber: string;
  phoneNumberSid: string | null;
  accountSid: string | null;
  workspaceId: string | null;
  found: boolean;
  managed: boolean;
  orphaned: boolean;
  surface: VoiceSurface;
  currentVoiceUrl: string | null;
  currentVoiceMethod: string | null;
  currentVoiceApplicationSid: string | null;
  currentTrunkSid: string | null;
  currentFriendlyName: string | null;
  warnings: string[];
  updated: boolean;
};

export type TwilioVoiceRoutingDrift = {
  status: RuntimeStatus;
  summary: string;
  expectedVoiceGatewayUrl: string;
  numbers: VoiceNumberDriftRecord[];
  warnings: string[];
  managedNumberCount: number;
  orphanedNumbers: VoiceNumberDriftRecord[];
};

type WorkspaceVoiceRecord = {
  id: string;
  name: string;
  twilioPhoneNumber: string | null;
  twilioPhoneNumberNormalized: string | null;
  twilioPhoneNumberSid: string | null;
  twilioSubaccountId: string | null;
};

type TwilioAccountRecord = {
  sid: string;
  friendlyName: string | null;
  status: string | null;
  isMaster: boolean;
};

type TwilioIncomingNumberRecord = {
  sid: string;
  phoneNumber: string;
  friendlyName: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  voiceApplicationSid: string | null;
  trunkSid: string | null;
  accountSid: string;
};

const masterAccountSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
const masterAuthToken = (process.env.TWILIO_AUTH_TOKEN || "").trim();

function hasTwilioAuth() {
  return Boolean(masterAccountSid && masterAuthToken);
}

function authHeader() {
  return `Basic ${Buffer.from(`${masterAccountSid}:${masterAuthToken}`).toString("base64")}`;
}

async function twilioApiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.twilio.com${path}`, {
    headers: { Authorization: authHeader() },
  });

  if (!response.ok) {
    throw new Error(`Twilio GET ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function twilioApiPost(path: string, body: URLSearchParams) {
  const response = await fetch(`https://api.twilio.com${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Twilio POST ${path} failed with ${response.status}`);
  }

  return response.json();
}

async function twilioTrunkDelete(path: string) {
  const response = await fetch(`https://trunking.twilio.com${path}`, {
    method: "DELETE",
    headers: { Authorization: authHeader() },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Twilio DELETE ${path} failed with ${response.status}`);
  }
}

async function listTwilioAccounts(): Promise<TwilioAccountRecord[]> {
  const records: TwilioAccountRecord[] = [];
  const seen = new Set<string>();

  if (masterAccountSid) {
    records.push({
      sid: masterAccountSid,
      friendlyName: "Master account",
      status: "active",
      isMaster: true,
    });
    seen.add(masterAccountSid);
  }

  const payload = await twilioApiGetJson<{
    accounts?: Array<{ sid: string; friendly_name?: string | null; status?: string | null }>;
  }>("/2010-04-01/Accounts.json?PageSize=200");

  for (const account of payload.accounts || []) {
    if (seen.has(account.sid)) continue;
    if ((account.status || "").toLowerCase() !== "active") continue;
    records.push({
      sid: account.sid,
      friendlyName: account.friendly_name || null,
      status: account.status || null,
      isMaster: account.sid === masterAccountSid,
    });
    seen.add(account.sid);
  }

  return records;
}

async function listIncomingNumbersForAccount(accountSid: string): Promise<TwilioIncomingNumberRecord[]> {
  const payload = await twilioApiGetJson<{
    incoming_phone_numbers?: Array<{
      sid: string;
      phone_number: string;
      friendly_name?: string | null;
      voice_url?: string | null;
      voice_method?: string | null;
      voice_application_sid?: string | null;
      trunk_sid?: string | null;
    }>;
  }>(`/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=200`);

  return (payload.incoming_phone_numbers || []).map((record) => ({
    sid: record.sid,
    phoneNumber: record.phone_number,
    friendlyName: record.friendly_name || null,
    voiceUrl: record.voice_url || null,
    voiceMethod: record.voice_method || null,
    voiceApplicationSid: record.voice_application_sid || null,
    trunkSid: record.trunk_sid || null,
    accountSid,
  }));
}

async function fetchIncomingNumber(accountSid: string, phoneNumberSid: string): Promise<TwilioIncomingNumberRecord | null> {
  try {
    const record = await twilioApiGetJson<{
      sid: string;
      phone_number: string;
      friendly_name?: string | null;
      voice_url?: string | null;
      voice_method?: string | null;
      voice_application_sid?: string | null;
      trunk_sid?: string | null;
    }>(`/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`);

    return {
      sid: record.sid,
      phoneNumber: record.phone_number,
      friendlyName: record.friendly_name || null,
      voiceUrl: record.voice_url || null,
      voiceMethod: record.voice_method || null,
      voiceApplicationSid: record.voice_application_sid || null,
      trunkSid: record.trunk_sid || null,
      accountSid,
    };
  } catch {
    return null;
  }
}

async function updateIncomingNumber(params: {
  accountSid: string;
  phoneNumberSid: string;
  voiceUrl: string;
  friendlyName?: string | null;
}) {
  const body = new URLSearchParams({
    VoiceUrl: params.voiceUrl,
    VoiceMethod: "POST",
    VoiceApplicationSid: "",
  });

  if (params.friendlyName) {
    body.set("FriendlyName", params.friendlyName);
  }

  await twilioApiPost(`/2010-04-01/Accounts/${params.accountSid}/IncomingPhoneNumbers/${params.phoneNumberSid}.json`, body);
}

async function removeTrunkAssociation(record: TwilioIncomingNumberRecord) {
  if (!record.trunkSid) return;
  await twilioTrunkDelete(`/v1/Trunks/${record.trunkSid}/PhoneNumbers/${record.sid}`);
}

function buildWorkspaceMaps(workspaces: WorkspaceVoiceRecord[]) {
  const byId = new Map<string, WorkspaceVoiceRecord>();
  const byPhone = new Map<string, WorkspaceVoiceRecord>();
  const bySubaccount = new Map<string, WorkspaceVoiceRecord>();

  for (const workspace of workspaces) {
    byId.set(workspace.id, workspace);
    const normalized = workspace.twilioPhoneNumberNormalized || normalizePhone(workspace.twilioPhoneNumber);
    if (normalized) byPhone.set(normalized, workspace);
    if (workspace.twilioSubaccountId && workspace.twilioSubaccountId !== masterAccountSid) {
      bySubaccount.set(workspace.twilioSubaccountId, workspace);
    }
  }

  return { byId, byPhone, bySubaccount };
}

function classifyNumber(params: {
  record: TwilioIncomingNumberRecord | null;
  account: TwilioAccountRecord | null;
  workspaceMaps: ReturnType<typeof buildWorkspaceMaps>;
  knownEarlymarkNumbers: string[];
}) {
  const normalizedPhone = normalizePhone(params.record?.phoneNumber);
  const parsedNumber = parseManagedVoiceNumberFriendlyName(params.record?.friendlyName);
  const parsedAccount = parseManagedSubaccountFriendlyName(params.account?.friendlyName);

  const workspace =
    (normalizedPhone ? params.workspaceMaps.byPhone.get(normalizedPhone) : null) ||
    (params.account?.sid ? params.workspaceMaps.bySubaccount.get(params.account.sid) : null) ||
    (parsedNumber?.workspaceId ? params.workspaceMaps.byId.get(parsedNumber.workspaceId) : null) ||
    (parsedAccount?.workspaceId ? params.workspaceMaps.byId.get(parsedAccount.workspaceId) : null) ||
    null;

  const isEarlymark =
    Boolean(params.record?.phoneNumber) &&
    params.knownEarlymarkNumbers.some((known) => phoneMatches(known, params.record?.phoneNumber)) ||
    parsedNumber?.scope === "earlymark";

  const managed =
    Boolean(params.record) &&
    (isEarlymark ||
      Boolean(workspace) ||
      Boolean(parsedNumber?.managed) ||
      Boolean(parsedAccount?.managed) ||
      Boolean(params.account && !params.account.isMaster));

  const orphaned = managed && !isEarlymark && !workspace;
  const surface: VoiceSurface = isEarlymark
    ? "inbound_demo"
    : parsedNumber?.surface || "normal";
  const scope: VoiceNumberDriftRecord["scope"] = isEarlymark
    ? "earlymark"
    : orphaned
      ? "orphaned"
      : "workspace";
  const desiredFriendlyName = managed
    ? buildManagedVoiceNumberFriendlyName({
        scope: isEarlymark ? "earlymark" : "workspace",
        surface,
        workspaceId: workspace?.id || null,
        label: workspace?.name || params.record?.phoneNumber || null,
      })
    : null;

  return {
    workspace,
    managed,
    orphaned,
    isEarlymark,
    scope,
    surface,
    desiredFriendlyName,
  };
}

function buildRecord(params: {
  record: TwilioIncomingNumberRecord | null;
  workspace: WorkspaceVoiceRecord | null;
  managed: boolean;
  orphaned: boolean;
  isEarlymark: boolean;
  scope: VoiceNumberDriftRecord["scope"];
  surface: VoiceSurface;
  desiredFriendlyName: string | null;
  expectedVoiceGatewayUrl: string;
  expectedPhoneNumber?: string | null;
  updated: boolean;
}) {
  const warnings: string[] = [];
  const effectivePhoneNumber = params.record?.phoneNumber || params.expectedPhoneNumber || "";

  if (!params.record) {
    warnings.push(`Phone number ${effectivePhoneNumber || "[unknown]"} was not found on Twilio.`);
  } else {
    if (params.record.trunkSid) {
      warnings.push(`Inbound number is still attached directly to SIP trunk ${params.record.trunkSid}.`);
    }
    if (params.record.voiceApplicationSid) {
      warnings.push(`Voice Application SID is set (${params.record.voiceApplicationSid}).`);
    }
    if ((params.record.voiceUrl || "") !== params.expectedVoiceGatewayUrl) {
      warnings.push(`Voice URL is ${params.record.voiceUrl || "[empty]"} instead of ${params.expectedVoiceGatewayUrl}.`);
    }
    if ((params.record.voiceMethod || "").toUpperCase() !== "POST") {
      warnings.push(`Voice method is ${(params.record.voiceMethod || "[empty]").toUpperCase()} instead of POST.`);
    }
    if (params.desiredFriendlyName && params.record.friendlyName !== params.desiredFriendlyName) {
      warnings.push("Friendly name metadata is missing or stale.");
    }
  }

  if (params.orphaned) {
    warnings.push("Managed customer number is missing a valid workspace mapping.");
  }

  return {
    scope: params.scope,
    label: params.isEarlymark ? "Earlymark inbound" : params.workspace?.name || params.record?.friendlyName || effectivePhoneNumber || "Unknown managed number",
    phoneNumber: effectivePhoneNumber,
    phoneNumberSid: params.record?.sid || null,
    accountSid: params.record?.accountSid || null,
    workspaceId: params.workspace?.id || null,
    found: Boolean(params.record),
    managed: params.managed,
    orphaned: params.orphaned,
    surface: params.surface,
    currentVoiceUrl: params.record?.voiceUrl || null,
    currentVoiceMethod: params.record?.voiceMethod || null,
    currentVoiceApplicationSid: params.record?.voiceApplicationSid || null,
    currentTrunkSid: params.record?.trunkSid || null,
    currentFriendlyName: params.record?.friendlyName || null,
    warnings,
    updated: params.updated,
  } satisfies VoiceNumberDriftRecord;
}

async function inspectManagedNumbers() {
  const knownEarlymarkNumbers = getKnownEarlymarkInboundNumbers();
  const workspaces = await db.workspace.findMany({
    where: {
      OR: [
        { twilioPhoneNumber: { not: null } },
        { twilioSubaccountId: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberNormalized: true,
      twilioPhoneNumberSid: true,
      twilioSubaccountId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const workspaceMaps = buildWorkspaceMaps(workspaces);
  const accounts = await listTwilioAccounts();
  const accountById = new Map(accounts.map((account) => [account.sid, account]));
  const numbers: TwilioIncomingNumberRecord[] = [];

  for (const account of accounts) {
    const accountNumbers = await listIncomingNumbersForAccount(account.sid);
    numbers.push(...accountNumbers);
  }

  return {
    knownEarlymarkNumbers,
    workspaceMaps,
    accountById,
    numbers,
  };
}

export async function findManagedTwilioNumberByPhone(phone?: string | null) {
  const normalized = normalizePhone(phone);
  if (!normalized || !hasTwilioAuth()) return null;

  const inspection = await inspectManagedNumbers();
  const record = inspection.numbers.find((entry) => phoneMatches(entry.phoneNumber, normalized)) || null;
  if (!record) return null;

  const classification = classifyNumber({
    record,
    account: inspection.accountById.get(record.accountSid) || null,
    workspaceMaps: inspection.workspaceMaps,
    knownEarlymarkNumbers: inspection.knownEarlymarkNumbers,
  });

  return {
    ...classification,
    record,
  };
}

export async function auditTwilioVoiceRouting(options?: { apply?: boolean }): Promise<TwilioVoiceRoutingDrift> {
  const apply = Boolean(options?.apply);
  const expectedVoiceGatewayUrl = getExpectedVoiceGatewayUrl();
  const warnings: string[] = [];

  if (!expectedVoiceGatewayUrl) {
    return {
      status: "unhealthy",
      summary: "NEXT_PUBLIC_APP_URL is missing, so the canonical Twilio voice gateway URL cannot be derived",
      expectedVoiceGatewayUrl,
      numbers: [],
      warnings: ["Set NEXT_PUBLIC_APP_URL so Twilio voice webhook reconciliation has a single source of truth."],
      managedNumberCount: 0,
      orphanedNumbers: [],
    };
  }

  if (!hasTwilioAuth()) {
    return {
      status: "unhealthy",
      summary: "Twilio master credentials are unavailable",
      expectedVoiceGatewayUrl,
      numbers: [],
      warnings: ["TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are required to audit or fix phone-number webhook drift."],
      managedNumberCount: 0,
      orphanedNumbers: [],
    };
  }

  const inspection = await inspectManagedNumbers();
  const managedRecords: VoiceNumberDriftRecord[] = [];
  const seenEarlymark = new Set<string>();

  for (const record of inspection.numbers) {
    const account = inspection.accountById.get(record.accountSid) || null;
    const classification = classifyNumber({
      record,
      account,
      workspaceMaps: inspection.workspaceMaps,
      knownEarlymarkNumbers: inspection.knownEarlymarkNumbers,
    });

    if (!classification.managed) continue;
    if (classification.isEarlymark) {
      seenEarlymark.add(normalizePhone(record.phoneNumber));
    }

    let updated = false;
    let effectiveRecord = record;

    if (apply && record.trunkSid) {
      await removeTrunkAssociation(record);
      updated = true;
      effectiveRecord = (await fetchIncomingNumber(record.accountSid, record.sid)) || effectiveRecord;
    }

    const needsVoiceUpdate =
      (effectiveRecord.voiceUrl || "") !== expectedVoiceGatewayUrl ||
      (effectiveRecord.voiceMethod || "").toUpperCase() !== "POST" ||
      Boolean(effectiveRecord.voiceApplicationSid) ||
      (classification.desiredFriendlyName && effectiveRecord.friendlyName !== classification.desiredFriendlyName);

    if (apply && needsVoiceUpdate) {
      await updateIncomingNumber({
        accountSid: effectiveRecord.accountSid,
        phoneNumberSid: effectiveRecord.sid,
        voiceUrl: expectedVoiceGatewayUrl,
        friendlyName: classification.desiredFriendlyName,
      });
      updated = true;
      effectiveRecord = (await fetchIncomingNumber(effectiveRecord.accountSid, effectiveRecord.sid)) || effectiveRecord;
    }

    managedRecords.push(
      buildRecord({
        record: effectiveRecord,
        workspace: classification.workspace,
        managed: classification.managed,
        orphaned: classification.orphaned,
        isEarlymark: classification.isEarlymark,
        scope: classification.scope,
        surface: classification.surface,
        desiredFriendlyName: classification.desiredFriendlyName,
        expectedVoiceGatewayUrl,
        updated,
      }),
    );
  }

  for (const phoneNumber of inspection.knownEarlymarkNumbers) {
    if (seenEarlymark.has(phoneNumber)) continue;
    managedRecords.push(
      buildRecord({
        record: null,
        workspace: null,
        managed: true,
        orphaned: false,
        isEarlymark: true,
        scope: "earlymark",
        surface: "inbound_demo",
        desiredFriendlyName: buildManagedVoiceNumberFriendlyName({
          scope: "earlymark",
          surface: "inbound_demo",
          label: phoneNumber,
        }),
        expectedVoiceGatewayUrl,
        expectedPhoneNumber: phoneNumber,
        updated: false,
      }),
    );
  }

  const drifted = managedRecords.filter((record) => record.warnings.length > 0);
  const orphanedNumbers = managedRecords.filter((record) => record.orphaned);
  const updatedCount = managedRecords.filter((record) => record.updated).length;
  const criticalMissing = managedRecords.filter((record) => record.scope === "earlymark" && !record.found);

  if (drifted.length > 0) {
    warnings.push(`${drifted.length} managed number(s) are not aligned to the canonical voice gateway.`);
  }
  if (updatedCount > 0) {
    warnings.push(`Reconciled ${updatedCount} number(s) back to the canonical voice gateway.`);
  }
  if (orphanedNumbers.length > 0) {
    warnings.push(`${orphanedNumbers.length} managed customer number(s) are missing workspace mappings.`);
  }
  if (criticalMissing.length > 0) {
    warnings.push(`Critical Earlymark inbound number(s) are missing on Twilio: ${criticalMissing.map((record) => record.phoneNumber).join(", ")}`);
  }

  const status: RuntimeStatus =
    criticalMissing.length > 0 || orphanedNumbers.length > 0
      ? "unhealthy"
      : drifted.length === 0
        ? "healthy"
        : updatedCount > 0
          ? "degraded"
          : "unhealthy";

  return {
    status,
    summary:
      status === "healthy"
        ? "All managed Twilio voice numbers point to the canonical voice gateway"
        : warnings[0] || "Twilio voice routing drift detected",
    expectedVoiceGatewayUrl,
    numbers: managedRecords,
    warnings,
    managedNumberCount: managedRecords.length,
    orphanedNumbers,
  };
}
