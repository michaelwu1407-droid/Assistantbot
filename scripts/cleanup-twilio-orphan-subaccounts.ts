import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import twilio from "twilio";

import { parseManagedSubaccountFriendlyName } from "../lib/voice-number-metadata";

type ScriptOptions = {
  apply: boolean;
  limit: number;
  minAgeHours: number;
  inspectConcurrency: number;
  closeConcurrency: number;
  includeUnrecognized: boolean;
  verbose: boolean;
};

type WorkspaceReference = {
  workspaceId: string;
  workspaceName: string;
  phoneNumber: string | null;
  phoneNumberSid: string | null;
  sipTrunkSid: string | null;
};

type InspectionResult = {
  sid: string;
  friendlyName: string;
  status: string;
  dateCreated: string | null;
  ageHours: number | null;
  patternKind: string | null;
  referencedWorkspace: WorkspaceReference | null;
  recent: boolean;
  hasPhoneNumber: boolean;
  phoneNumberCount: number;
  inspectionError: string | null;
  eligibleToClose: boolean;
  skipReason: string | null;
};

function loadEnvironment() {
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const target = path.join(root, file);
    if (fs.existsSync(target)) {
      loadEnv({ path: target, override: false });
    }
  }
}

function parseArgs(argv: string[]): ScriptOptions {
  const readNumber = (flag: string, fallback: number) => {
    const match = argv.find((value) => value.startsWith(`${flag}=`));
    if (!match) return fallback;
    const parsed = Number(match.split("=")[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    apply: argv.includes("--apply"),
    limit: readNumber("--limit", 1000),
    minAgeHours: readNumber("--min-age-hours", 24),
    inspectConcurrency: readNumber("--inspect-concurrency", 8),
    closeConcurrency: readNumber("--close-concurrency", 4),
    includeUnrecognized: argv.includes("--include-unrecognized"),
    verbose: argv.includes("--verbose"),
  };
}

function classifyFriendlyName(value?: string | null) {
  const friendlyName = (value || "").trim();
  if (!friendlyName) return null;
  if (parseManagedSubaccountFriendlyName(friendlyName)) return "managed";
  if (/^Workspace:/i.test(friendlyName)) return "legacy_workspace";
  if (/^Test-Comms-Diagnostic/i.test(friendlyName)) return "diagnostic";
  return null;
}

async function asyncPool<TItem, TResult>(
  items: TItem[],
  limit: number,
  iterator: (item: TItem, index: number) => Promise<TResult>,
) {
  const results: TResult[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) return;
      results[index] = await iterator(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => worker()));
  return results;
}

function formatAgeHours(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "unknown";
  if (value < 24) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

async function main() {
  loadEnvironment();
  const options = parseArgs(process.argv.slice(2));

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN.");
  }

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  const prisma = new PrismaClient();
  const client = twilio(accountSid, authToken);
  const now = Date.now();

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        twilioSubaccountId: { not: null },
      },
      select: {
        id: true,
        name: true,
        twilioSubaccountId: true,
        twilioPhoneNumber: true,
        twilioPhoneNumberSid: true,
        twilioSipTrunkSid: true,
      },
    });

    const referencedBySid = new Map<string, WorkspaceReference>();
    for (const workspace of workspaces) {
      const sid = (workspace.twilioSubaccountId || "").trim();
      if (!sid || sid === accountSid) continue;
      referencedBySid.set(sid, {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        phoneNumber: workspace.twilioPhoneNumber,
        phoneNumberSid: workspace.twilioPhoneNumberSid,
        sipTrunkSid: workspace.twilioSipTrunkSid,
      });
    }

    const activeAccounts = await client.api.v2010.accounts.list({ status: "active", limit: options.limit });
    const suspendedAccounts = await client.api.v2010.accounts.list({ status: "suspended", limit: options.limit });
    const accounts = Array.from(
      new Map([...activeAccounts, ...suspendedAccounts].map((account) => [account.sid, account])).values(),
    );
    const childAccounts = accounts.filter((account) => account.sid !== accountSid);

    console.log(`Twilio child accounts fetched: ${childAccounts.length}`);
    console.log(`Workspace-referenced subaccounts: ${referencedBySid.size}`);
    console.log(
      `Mode: ${options.apply ? "APPLY" : "DRY-RUN"} | minAgeHours=${options.minAgeHours} | includeUnrecognized=${options.includeUnrecognized}`,
    );

    const inspections = await asyncPool(childAccounts, options.inspectConcurrency, async (account, index) => {
      const friendlyName = account.friendlyName || "";
      const patternKind = classifyFriendlyName(friendlyName);
      const referencedWorkspace = referencedBySid.get(account.sid) || null;
      const dateCreated = account.dateCreated ? new Date(account.dateCreated).toISOString() : null;
      const ageHours = account.dateCreated ? (now - new Date(account.dateCreated).getTime()) / 36e5 : null;
      const recent = ageHours !== null && ageHours < options.minAgeHours;

      let phoneNumberCount = 0;
      let inspectionError: string | null = null;

      try {
        const numbers = await client.api.v2010.accounts(account.sid).incomingPhoneNumbers.list({ limit: 1 });
        phoneNumberCount = numbers.length;
      } catch (error) {
        inspectionError = `phone-inspection: ${error instanceof Error ? error.message : "Unknown error"}`;
      }

      let skipReason: string | null = null;
      if (referencedWorkspace) {
        skipReason = `referenced by workspace ${referencedWorkspace.workspaceName} (${referencedWorkspace.workspaceId})`;
      } else if (account.status === "closed") {
        skipReason = "already closed";
      } else if (recent) {
        skipReason = `too recent (${formatAgeHours(ageHours)})`;
      } else if (!patternKind && !options.includeUnrecognized) {
        skipReason = "unrecognized friendly name";
      } else if (phoneNumberCount > 0) {
        skipReason = `has phone numbers (${phoneNumberCount})`;
      }

      const result: InspectionResult = {
        sid: account.sid,
        friendlyName,
        status: account.status || "unknown",
        dateCreated,
        ageHours,
        patternKind,
        referencedWorkspace,
        recent,
        hasPhoneNumber: phoneNumberCount > 0,
        phoneNumberCount,
        inspectionError,
        eligibleToClose: !skipReason,
        skipReason,
      };

      if (options.verbose) {
        console.log(
          `[inspect ${index + 1}/${childAccounts.length}] ${result.sid} | ${result.friendlyName || "(no name)"} | eligible=${result.eligibleToClose ? "yes" : "no"}${result.skipReason ? ` | ${result.skipReason}` : ""}`,
        );
      }

      return result;
    });

    const eligible = inspections.filter((item) => item.eligibleToClose);
    const referenced = inspections.filter((item) => item.referencedWorkspace);
    const unrecognized = inspections.filter((item) => item.skipReason === "unrecognized friendly name");
    const recent = inspections.filter((item) => item.recent && !item.referencedWorkspace);
    const withNumbers = inspections.filter((item) => item.phoneNumberCount > 0 && !item.referencedWorkspace);
    const inspectionErrors = inspections.filter((item) => item.inspectionError);

    console.log("\nInspection summary");
    console.log(`  Eligible to close: ${eligible.length}`);
    console.log(`  Referenced by workspace: ${referenced.length}`);
    console.log(`  Recent and skipped: ${recent.length}`);
    console.log(`  Unrecognized and skipped: ${unrecognized.length}`);
    console.log(`  Resource-bearing (numbers): ${withNumbers.length}`);
    console.log(`  Inspection errors: ${inspectionErrors.length}`);

    if (eligible.length > 0) {
      console.log("\nEligible subaccounts");
      for (const item of eligible.slice(0, 50)) {
        console.log(
          `  ${item.sid} | ${item.friendlyName || "(no name)"} | status=${item.status} | age=${formatAgeHours(item.ageHours)} | pattern=${item.patternKind || "unknown"}`,
        );
      }
      if (eligible.length > 50) {
        console.log(`  ... ${eligible.length - 50} more eligible subaccounts omitted`);
      }
    }

    if (!options.apply) {
      console.log("\nDry-run complete. Re-run with --apply to close only the eligible subaccounts above.");
      return;
    }

    if (eligible.length === 0) {
      console.log("\nNo eligible orphan subaccounts to close.");
      return;
    }

    let closedCount = 0;
    const closeFailures: Array<{ sid: string; error: string }> = [];

    await asyncPool(eligible, options.closeConcurrency, async (item) => {
      try {
        await client.api.v2010.accounts(item.sid).update({ status: "closed" });
        closedCount += 1;
        console.log(`Closed ${item.sid} | ${item.friendlyName || "(no name)"}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        closeFailures.push({ sid: item.sid, error: message });
        console.error(`Failed to close ${item.sid}: ${message}`);
      }
    });

    console.log("\nApply summary");
    console.log(`  Closed: ${closedCount}`);
    console.log(`  Failed: ${closeFailures.length}`);
    if (closeFailures.length > 0) {
      for (const failure of closeFailures.slice(0, 20)) {
        console.log(`  ${failure.sid} | ${failure.error}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Twilio orphan subaccount cleanup failed:", error);
  process.exit(1);
});
