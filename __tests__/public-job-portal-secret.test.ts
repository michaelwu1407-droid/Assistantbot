import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildPublicJobPortalUrl,
  createPublicJobPortalToken,
  verifyPublicJobPortalToken,
} from "@/lib/public-job-portal";

const SECRET_VARS = ["CRON_SECRET", "ENCRYPTION_KEY", "TELEMETRY_ADMIN_KEY"] as const;

const tokenInput = {
  dealId: "deal_1",
  contactId: "contact_1",
  workspaceId: "ws_1",
};

describe("public job portal token signing", () => {
  const saved: Record<string, string | undefined> = {};
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    for (const key of SECRET_VARS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    savedNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    for (const key of SECRET_VARS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    if (savedNodeEnv === undefined) delete (process.env as Record<string, unknown>).NODE_ENV;
    else (process.env as Record<string, string>).NODE_ENV = savedNodeEnv;
  });

  function setNodeEnv(value: string) {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  it("signs and round-trips a token when a secret is configured", () => {
    process.env.CRON_SECRET = "a-real-secret";
    setNodeEnv("production");

    const token = createPublicJobPortalToken(tokenInput);
    expect(token).toBeTruthy();
    expect(verifyPublicJobPortalToken(token as string)).toMatchObject(tokenInput);
  });

  it("falls back to any of the three accepted secret vars", () => {
    setNodeEnv("production");
    for (const key of SECRET_VARS) {
      process.env[key] = `secret-via-${key}`;
      expect(createPublicJobPortalToken(tokenInput)).toBeTruthy();
      delete process.env[key];
    }
  });

  // The point of the change: a production deployment missing every secret used
  // to fall back to a shared literal, which made tokens forgeable for any job.
  it("refuses to mint a token in production with no secret configured", () => {
    setNodeEnv("production");
    expect(createPublicJobPortalToken(tokenInput)).toBeNull();
    expect(buildPublicJobPortalUrl(tokenInput)).toBeNull();
  });

  it("rejects every token in production with no secret configured", () => {
    process.env.CRON_SECRET = "a-real-secret";
    setNodeEnv("production");
    const token = createPublicJobPortalToken(tokenInput) as string;

    delete process.env.CRON_SECRET;
    expect(verifyPublicJobPortalToken(token)).toBeNull();
  });

  it("still works outside production so local development needs no setup", () => {
    setNodeEnv("development");
    const token = createPublicJobPortalToken(tokenInput);
    expect(token).toBeTruthy();
    expect(verifyPublicJobPortalToken(token as string)).toMatchObject(tokenInput);
  });
});
