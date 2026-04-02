import "dotenv/config";
import { getAllServiceReadiness } from "../lib/real-integration-readiness";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type FetchSummary = {
  ok: boolean;
  status: number;
  url: string;
  body?: JsonValue;
  error?: string;
};

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const providedBaseUrl = getArgValue("--base-url");
const baseUrl = (providedBaseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const mode = process.argv.includes("--active") ? "active" : "passive";

async function fetchJson(path: string): Promise<FetchSummary> {
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      headers: { "content-type": "application/json" },
    });

    let body: JsonValue | undefined;
    try {
      body = (await response.json()) as JsonValue;
    } catch {
      body = undefined;
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

function logSection(title: string) {
  console.log(`\n## ${title}`);
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  console.log(`# Real Integration Verification (${mode})`);
  console.log(`Base URL: ${baseUrl}`);

  const services = getAllServiceReadiness(process.env);
  logSection("Environment readiness");
  for (const service of services) {
    console.log(
      `${service.ready ? "PASS" : "FAIL"} ${service.name} required=${service.presentRequired.length}/${service.required.length}`,
    );
    if (service.missingRequired.length > 0) {
      console.log(`  missing required: ${service.missingRequired.join(", ")}`);
    }
    if (service.missingOptional.length > 0) {
      console.log(`  missing optional: ${service.missingOptional.join(", ")}`);
    }
  }

  logSection("Application probes");
  const [health, checkEnv] = await Promise.all([fetchJson("/api/health"), fetchJson("/api/check-env")]);

  for (const probe of [health, checkEnv]) {
    console.log(`${probe.ok ? "PASS" : "FAIL"} ${probe.url} (${probe.status})`);
    if (probe.error) {
      console.log(`  error: ${probe.error}`);
    }
  }

  if (health.body) {
    console.log("\n/api/health summary:");
    printJson(health.body);
  }

  if (checkEnv.body) {
    console.log("\n/api/check-env summary:");
    printJson(checkEnv.body);
  }

  logSection("Next steps");
  console.log("1. Passive mode checks staging readiness only and does not create Stripe/Twilio/Resend/LiveKit side effects.");
  console.log("2. After passive mode is green, run the manual checklist in docs/REAL_INTEGRATION_VERIFICATION.md.");
  console.log("3. Use a dedicated staging workspace and test credentials before any active verification.");

  if (mode === "active") {
    console.log("4. Active mode is intentionally documentation-only right now. Follow the doc checklist to avoid accidental live side effects.");
  }
}

main().catch((error) => {
  console.error("verify-real-integrations failed");
  console.error(error);
  process.exit(1);
});
