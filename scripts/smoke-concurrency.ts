import "dotenv/config";
import { db } from "../lib/db";

type EndpointResult = {
  name: string;
  status: number;
  durationMs: number;
  body: string;
  error?: string;
};

type TestReport = {
  name: string;
  attempted: number;
  succeeded: number;
  failed: number;
  uniqueRowsCreated: number;
  expected: number;
  passed: boolean;
  notes: string[];
};

function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1] ?? null;
}

const BASE_URL = (
  getArg("--base-url") ||
  process.env.SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const SESSION_COOKIE = getArg("--cookie") || process.env.SMOKE_SESSION_COOKIE || "";
const CONCURRENCY = Number(getArg("--n") || process.env.SMOKE_CONCURRENCY || 50);
const RUN_TAG = `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

if (!SESSION_COOKIE) {
  console.error(
    "[smoke] SMOKE_SESSION_COOKIE (or --cookie) is required. Open the app in a logged-in browser, copy the auth cookie, and pass it.",
  );
  process.exit(2);
}

async function fireOne(url: string, body: unknown, label: string, attempt: number): Promise<EndpointResult> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: SESSION_COOKIE,
        "x-smoke-test": RUN_TAG,
        "x-smoke-attempt": String(attempt),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text().catch(() => "");
    return {
      name: label,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body: text.slice(0, 400),
    };
  } catch (error) {
    return {
      name: label,
      status: 0,
      durationMs: Date.now() - startedAt,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fireBatch(label: string, build: (i: number) => { url: string; body: unknown }) {
  const tasks: Promise<EndpointResult>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const { url, body } = build(i);
    tasks.push(fireOne(url, body, label, i));
  }
  return Promise.all(tasks);
}

function summarize(results: EndpointResult[]) {
  const succeeded = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const failed = results.length - succeeded;
  const statuses = results.reduce<Record<string, number>>((acc, r) => {
    const key = String(r.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { succeeded, failed, statuses };
}

async function smokeContactsCreate(): Promise<TestReport> {
  const sharedEmail = `${RUN_TAG}-contact@smoke.local`;
  const sharedPhone = `+15550${(Date.now() % 1_000_000).toString().padStart(6, "0")}`;
  const results = await fireBatch("contacts.create.dedup", () => ({
    url: `${BASE_URL}/api/contacts`,
    body: {
      name: `Smoke ${RUN_TAG}`,
      email: sharedEmail,
      phone: sharedPhone,
      source: "smoke-test",
    },
  }));
  const { succeeded, failed, statuses } = summarize(results);

  const created = await db.contact.findMany({
    where: { OR: [{ email: sharedEmail }, { phone: sharedPhone }] },
    select: { id: true, email: true, phone: true, name: true },
  });
  const uniqueRows = created.length;
  const passed = uniqueRows <= 1;
  const notes = [
    `attempts=${results.length} 2xx=${succeeded} other=${failed} statuses=${JSON.stringify(statuses)}`,
    `dbRows=${uniqueRows} (expected at most 1 — same email + phone)`,
  ];
  if (!passed) notes.push(`FAIL: ${uniqueRows} duplicate contact rows created`);
  return {
    name: "contacts.create.dedup",
    attempted: results.length,
    succeeded,
    failed,
    uniqueRowsCreated: uniqueRows,
    expected: 1,
    passed,
    notes,
  };
}

async function smokeDealsCreate(): Promise<TestReport> {
  const sharedTitle = `smoke-deal-${RUN_TAG}`;
  const results = await fireBatch("deals.create", () => ({
    url: `${BASE_URL}/api/deals`,
    body: {
      title: sharedTitle,
      amount: 1234,
      stage: "lead",
      source: "smoke-test",
    },
  }));
  const { succeeded, failed, statuses } = summarize(results);
  const created = await db.deal.findMany({
    where: { title: sharedTitle },
    select: { id: true, stage: true },
  });
  const uniqueRows = created.length;
  const passed = uniqueRows === succeeded;
  const notes = [
    `attempts=${results.length} 2xx=${succeeded} other=${failed} statuses=${JSON.stringify(statuses)}`,
    `dbRows=${uniqueRows} (expected ≈ ${succeeded} — every 2xx should be one deal)`,
  ];
  if (!passed) {
    notes.push(`FAIL: 2xx count (${succeeded}) does not equal db row count (${uniqueRows}) — silent loss or phantom create`);
  }
  return {
    name: "deals.create",
    attempted: results.length,
    succeeded,
    failed,
    uniqueRowsCreated: uniqueRows,
    expected: succeeded,
    passed,
    notes,
  };
}

async function smokeDealsUpdateStage(): Promise<TestReport> {
  const seedTitle = `smoke-stage-target-${RUN_TAG}`;
  const seedRes = await fireOne(
    `${BASE_URL}/api/deals`,
    { title: seedTitle, amount: 100, stage: "lead", source: "smoke-test" },
    "deals.create.seed",
    0,
  );
  let dealId: string | null = null;
  try {
    const parsed = JSON.parse(seedRes.body) as { dealId?: string; deal?: { id?: string }; id?: string };
    dealId = parsed?.dealId || parsed?.deal?.id || parsed?.id || null;
  } catch {
    dealId = null;
  }
  if (!dealId) {
    return {
      name: "deals.updateStage",
      attempted: 0,
      succeeded: 0,
      failed: 0,
      uniqueRowsCreated: 0,
      expected: 0,
      passed: false,
      notes: [`FAIL: could not seed deal (status=${seedRes.status} body=${seedRes.body.slice(0, 120)})`],
    };
  }

  const results = await fireBatch("deals.updateStage", () => ({
    url: `${BASE_URL}/api/deals/update-stage`,
    body: { dealId, stage: "qualified" },
  }));
  const { succeeded, failed, statuses } = summarize(results);

  const activities = await db.activity.findMany({
    where: { dealId, title: { contains: "Moved to" } },
    select: { id: true, createdAt: true, title: true },
  });
  const uniqueActivities = activities.length;
  const passed = uniqueActivities <= 1;
  const notes = [
    `attempts=${results.length} 2xx=${succeeded} other=${failed} statuses=${JSON.stringify(statuses)}`,
    `dbActivities=${uniqueActivities} (expected at most 1 — only one real stage transition happened)`,
  ];
  if (!passed) notes.push(`FAIL: ${uniqueActivities} stage-change activities for a single transition`);
  return {
    name: "deals.updateStage",
    attempted: results.length,
    succeeded,
    failed,
    uniqueRowsCreated: uniqueActivities,
    expected: 1,
    passed,
    notes,
  };
}

async function cleanup() {
  await db.activity.deleteMany({ where: { description: { contains: RUN_TAG } } }).catch(() => {});
  await db.deal.deleteMany({ where: { title: { contains: RUN_TAG } } }).catch(() => {});
  await db.contact.deleteMany({ where: { name: { contains: RUN_TAG } } }).catch(() => {});
}

async function main() {
  console.log(
    `[smoke] runTag=${RUN_TAG} baseUrl=${BASE_URL} concurrency=${CONCURRENCY} session=${
      SESSION_COOKIE ? "yes" : "NO"
    }`,
  );
  const reports: TestReport[] = [];
  reports.push(await smokeContactsCreate());
  reports.push(await smokeDealsCreate());
  reports.push(await smokeDealsUpdateStage());

  let allPassed = true;
  for (const r of reports) {
    const tag = r.passed ? "PASS" : "FAIL";
    console.log(`\n[${tag}] ${r.name}`);
    for (const note of r.notes) console.log(`  ${note}`);
    if (!r.passed) allPassed = false;
  }

  await cleanup();
  await db.$disconnect();

  if (!allPassed) {
    console.error("\n[smoke] one or more concurrency tests FAILED");
    process.exit(1);
  }
  console.log("\n[smoke] all concurrency checks passed");
}

main().catch(async (error) => {
  console.error("[smoke] crashed:", error);
  await cleanup();
  await db.$disconnect();
  process.exit(1);
});
