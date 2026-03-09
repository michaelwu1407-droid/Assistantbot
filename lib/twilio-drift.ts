import type { IncomingPhoneNumberInstance } from "twilio/lib/rest/api/v2010/account/incomingPhoneNumber";
import { db } from "@/lib/db";
import { getExpectedVoiceGatewayUrl, getKnownEarlymarkInboundNumbers, phoneMatches } from "@/lib/earlymark-inbound-config";
import { getWorkspaceTwilioClient, twilioMasterClient } from "@/lib/twilio";

export type RuntimeStatus = "healthy" | "degraded" | "unhealthy";

export type VoiceNumberDriftRecord = {
  scope: "workspace" | "earlymark";
  label: string;
  phoneNumber: string;
  phoneNumberSid: string | null;
  workspaceId: string | null;
  found: boolean;
  currentVoiceUrl: string | null;
  currentVoiceMethod: string | null;
  currentVoiceApplicationSid: string | null;
  warnings: string[];
  updated: boolean;
};

export type TwilioVoiceRoutingDrift = {
  status: RuntimeStatus;
  summary: string;
  expectedVoiceGatewayUrl: string;
  numbers: VoiceNumberDriftRecord[];
  warnings: string[];
};

async function findIncomingNumber(
  client: ReturnType<typeof getWorkspaceTwilioClient> | typeof twilioMasterClient,
  phoneNumberSid?: string | null,
  phoneNumber?: string | null,
) {
  if (!client) return null;

  if (phoneNumberSid) {
    try {
      return await client.incomingPhoneNumbers(phoneNumberSid).fetch();
    } catch {
      // Fall through to phone-number match.
    }
  }

  if (!phoneNumber) return null;
  const records = await client.incomingPhoneNumbers.list({ limit: 200 });
  return records.find((record) => phoneMatches(record.phoneNumber, phoneNumber)) || null;
}

function buildRecord(params: {
  scope: "workspace" | "earlymark";
  label: string;
  phoneNumber: string;
  phoneNumberSid?: string | null;
  workspaceId?: string | null;
  record: IncomingPhoneNumberInstance | null;
  expectedVoiceGatewayUrl: string;
  updated: boolean;
}) {
  const warnings: string[] = [];

  if (!params.record) {
    warnings.push("Phone number was not found on the expected Twilio account.");
  } else {
    if (params.record.voiceApplicationSid) {
      warnings.push(`Voice Application SID is set (${params.record.voiceApplicationSid}).`);
    }
    if ((params.record.voiceUrl || "") !== params.expectedVoiceGatewayUrl) {
      warnings.push(`Voice URL is ${params.record.voiceUrl || "[empty]"} instead of ${params.expectedVoiceGatewayUrl}.`);
    }
    if ((params.record.voiceMethod || "").toUpperCase() !== "POST") {
      warnings.push(`Voice method is ${(params.record.voiceMethod || "[empty]").toUpperCase()} instead of POST.`);
    }
  }

  return {
    scope: params.scope,
    label: params.label,
    phoneNumber: params.phoneNumber,
    phoneNumberSid: params.record?.sid || params.phoneNumberSid || null,
    workspaceId: params.workspaceId || null,
    found: Boolean(params.record),
    currentVoiceUrl: params.record?.voiceUrl || null,
    currentVoiceMethod: params.record?.voiceMethod || null,
    currentVoiceApplicationSid: params.record?.voiceApplicationSid || null,
    warnings,
    updated: params.updated,
  } satisfies VoiceNumberDriftRecord;
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
    };
  }

  if (!twilioMasterClient) {
    return {
      status: "unhealthy",
      summary: "Twilio master client is unavailable",
      expectedVoiceGatewayUrl,
      numbers: [],
      warnings: ["TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are required to audit or fix phone-number webhook drift."],
    };
  }

  const workspaceNumbers = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberSid: true,
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const earlymarkNumbers = getKnownEarlymarkInboundNumbers();
  const numbers: VoiceNumberDriftRecord[] = [];

  for (const workspace of workspaceNumbers) {
    const client = getWorkspaceTwilioClient(workspace);
    const record = await findIncomingNumber(client, workspace.twilioPhoneNumberSid, workspace.twilioPhoneNumber);

    let updated = false;
    if (
      apply &&
      record &&
      (
        (record.voiceUrl || "") !== expectedVoiceGatewayUrl ||
        (record.voiceMethod || "").toUpperCase() !== "POST" ||
        Boolean(record.voiceApplicationSid)
      )
    ) {
      await client!.incomingPhoneNumbers(record.sid).update({
        voiceUrl: expectedVoiceGatewayUrl,
        voiceMethod: "POST",
        voiceApplicationSid: "",
      });
      updated = true;
    }

    const refreshed = updated
      ? await findIncomingNumber(client, record?.sid || workspace.twilioPhoneNumberSid, workspace.twilioPhoneNumber)
      : record;

    numbers.push(
      buildRecord({
        scope: "workspace",
        label: workspace.name,
        phoneNumber: workspace.twilioPhoneNumber || "",
        phoneNumberSid: workspace.twilioPhoneNumberSid,
        workspaceId: workspace.id,
        record: refreshed,
        expectedVoiceGatewayUrl,
        updated,
      }),
    );
  }

  for (const phoneNumber of earlymarkNumbers) {
    const duplicateWorkspaceNumber = workspaceNumbers.some((workspace) => phoneMatches(workspace.twilioPhoneNumber, phoneNumber));
    if (duplicateWorkspaceNumber) continue;

    const record = await findIncomingNumber(twilioMasterClient, null, phoneNumber);
    let updated = false;

    if (
      apply &&
      record &&
      (
        (record.voiceUrl || "") !== expectedVoiceGatewayUrl ||
        (record.voiceMethod || "").toUpperCase() !== "POST" ||
        Boolean(record.voiceApplicationSid)
      )
    ) {
      await twilioMasterClient.incomingPhoneNumbers(record.sid).update({
        voiceUrl: expectedVoiceGatewayUrl,
        voiceMethod: "POST",
        voiceApplicationSid: "",
      });
      updated = true;
    }

    const refreshed = updated
      ? await findIncomingNumber(twilioMasterClient, record?.sid, phoneNumber)
      : record;

    numbers.push(
      buildRecord({
        scope: "earlymark",
        label: "Earlymark inbound",
        phoneNumber,
        record: refreshed,
        expectedVoiceGatewayUrl,
        updated,
      }),
    );
  }

  const drifted = numbers.filter((entry) => entry.warnings.length > 0);
  const updatedCount = numbers.filter((entry) => entry.updated).length;

  if (drifted.length > 0) {
    warnings.push(`${drifted.length} number(s) are not aligned to the canonical voice gateway.`);
  }
  if (updatedCount > 0) {
    warnings.push(`Reconciled ${updatedCount} number(s) back to the canonical voice gateway.`);
  }

  const status: RuntimeStatus =
    drifted.length === 0
      ? "healthy"
      : apply && drifted.every((entry) => entry.updated)
        ? "degraded"
        : "unhealthy";

  return {
    status,
    summary:
      status === "healthy"
        ? "All Twilio voice numbers point to the canonical voice gateway"
        : warnings[0] || "Twilio voice routing drift detected",
    expectedVoiceGatewayUrl,
    numbers,
    warnings,
  };
}
