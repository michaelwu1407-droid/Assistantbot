import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { createPublicJobPortalToken } from "../lib/public-job-portal";
import { E2E_AUTH_COOKIE_NAME, E2E_IDS } from "./constants";

const baseURL = "http://localhost:3000";
const authDir = path.join(process.cwd(), "e2e", ".auth");
const e2eDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:54329/assistantbot_e2e?schema=public";
const e2eContainerName = "assistantbot-playwright-postgres";

function run(command: string) {
  execSync(command, {
    stdio: "pipe",
    timeout: 15_000,
    env: {
      ...process.env,
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
    },
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDatabase() {
  process.env.DATABASE_URL = e2eDatabaseUrl;
  process.env.DIRECT_URL = e2eDatabaseUrl;

  let containerExists = true;
  try {
    run(`docker inspect ${e2eContainerName}`);
  } catch {
    containerExists = false;
  }

  if (!containerExists) {
    run(
      [
        `docker run -d`,
        `--name ${e2eContainerName}`,
        `-e POSTGRES_PASSWORD=postgres`,
        `-e POSTGRES_DB=assistantbot_e2e`,
        `-p 54329:5432`,
        `postgres:16-alpine`,
      ].join(" "),
    );
  } else {
    run(`docker start ${e2eContainerName}`);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      run(`docker exec ${e2eContainerName} pg_isready -U postgres -d assistantbot_e2e`);
      break;
    } catch (error) {
      if (attempt === 29) {
        throw error;
      }
      await sleep(1000);
    }
  }

  run("npx prisma db push --skip-generate");
}

async function writeStorageState(fileName: string, userId: string) {
  await fs.writeFile(
    path.join(authDir, fileName),
    JSON.stringify(
      {
        cookies: [
          {
            name: E2E_AUTH_COOKIE_NAME,
            value: userId,
            url: baseURL,
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );
}

async function seed() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  dayAfter.setHours(14, 0, 0, 0);

  await prisma.workspace.upsert({
    where: { id: E2E_IDS.workspaceId },
    update: {
      name: "Earlymark E2E Plumbing",
      type: "TRADIE",
      industryType: "TRADES",
      ownerId: E2E_IDS.ownerUserId,
      location: "Sydney NSW",
      onboardingComplete: true,
      tutorialComplete: true,
      subscriptionStatus: "active",
      twilioPhoneNumber: "+61485010634",
      workspaceTimezone: "Australia/Sydney",
      settings: {
        callForwardingEnabled: true,
        callForwardingMode: "backup",
        callForwardingDelaySec: 20,
        businessContact: {
          phone: "+61485010634",
          email: "owner+e2e@earlymark.test",
          address: "12 Test Street, Sydney NSW",
        },
      } satisfies Prisma.JsonObject,
    },
    create: {
      id: E2E_IDS.workspaceId,
      name: "Earlymark E2E Plumbing",
      type: "TRADIE",
      industryType: "TRADES",
      ownerId: E2E_IDS.ownerUserId,
      location: "Sydney NSW",
      onboardingComplete: true,
      tutorialComplete: true,
      subscriptionStatus: "active",
      twilioPhoneNumber: "+61485010634",
      workspaceTimezone: "Australia/Sydney",
      settings: {
        callForwardingEnabled: true,
        callForwardingMode: "backup",
        callForwardingDelaySec: 20,
        businessContact: {
          phone: "+61485010634",
          email: "owner+e2e@earlymark.test",
          address: "12 Test Street, Sydney NSW",
        },
      } satisfies Prisma.JsonObject,
    },
  });

  await prisma.user.upsert({
    where: { id: E2E_IDS.ownerUserId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      email: "owner+e2e@earlymark.test",
      name: "E2E Owner",
      phone: "+61411111111",
      role: "OWNER",
      hasOnboarded: true,
    },
    create: {
      id: E2E_IDS.ownerUserId,
      workspaceId: E2E_IDS.workspaceId,
      email: "owner+e2e@earlymark.test",
      name: "E2E Owner",
      phone: "+61411111111",
      role: "OWNER",
      hasOnboarded: true,
    },
  });

  await prisma.user.upsert({
    where: { id: E2E_IDS.teamUserId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      email: "tradie+e2e@earlymark.test",
      name: "E2E Tradie",
      phone: "+61422222222",
      role: "TEAM_MEMBER",
      hasOnboarded: true,
    },
    create: {
      id: E2E_IDS.teamUserId,
      workspaceId: E2E_IDS.workspaceId,
      email: "tradie+e2e@earlymark.test",
      name: "E2E Tradie",
      phone: "+61422222222",
      role: "TEAM_MEMBER",
      hasOnboarded: true,
    },
  });

  await prisma.contact.upsert({
    where: { id: E2E_IDS.leadContactId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Lead Contact",
      email: "lead+e2e@example.com",
      phone: "+61430000001",
      address: "100 Lead Street, Sydney NSW",
    },
    create: {
      id: E2E_IDS.leadContactId,
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Lead Contact",
      email: "lead+e2e@example.com",
      phone: "+61430000001",
      address: "100 Lead Street, Sydney NSW",
    },
  });

  await prisma.contact.upsert({
    where: { id: E2E_IDS.scheduledContactId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Scheduled Contact",
      email: "scheduled+e2e@example.com",
      phone: "+61430000002",
      address: "200 Schedule Street, Sydney NSW",
    },
    create: {
      id: E2E_IDS.scheduledContactId,
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Scheduled Contact",
      email: "scheduled+e2e@example.com",
      phone: "+61430000002",
      address: "200 Schedule Street, Sydney NSW",
    },
  });

  await prisma.contact.upsert({
    where: { id: E2E_IDS.ownerContactId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Owner Contact",
      email: "owner-job+e2e@example.com",
      phone: "+61430000003",
      address: "300 Owner Street, Sydney NSW",
    },
    create: {
      id: E2E_IDS.ownerContactId,
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Owner Contact",
      email: "owner-job+e2e@example.com",
      phone: "+61430000003",
      address: "300 Owner Street, Sydney NSW",
    },
  });

  await prisma.contact.upsert({
    where: { id: E2E_IDS.emailOnlyContactId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Email Only Contact",
      email: "email-only+e2e@example.com",
      phone: null,
      address: "400 Email Street, Sydney NSW",
    },
    create: {
      id: E2E_IDS.emailOnlyContactId,
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Email Only Contact",
      email: "email-only+e2e@example.com",
      phone: null,
      address: "400 Email Street, Sydney NSW",
    },
  });

  await prisma.contact.upsert({
    where: { id: E2E_IDS.phoneOnlyContactId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Phone Only Contact",
      email: null,
      phone: "+61430000004",
      address: "500 Phone Street, Sydney NSW",
    },
    create: {
      id: E2E_IDS.phoneOnlyContactId,
      workspaceId: E2E_IDS.workspaceId,
      name: "E2E Phone Only Contact",
      email: null,
      phone: "+61430000004",
      address: "500 Phone Street, Sydney NSW",
    },
  });

  await prisma.deal.upsert({
    where: { id: E2E_IDS.leadDealId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.leadContactId,
      title: "E2E Lead Leak Quote",
      stage: "NEW",
      address: "100 Lead Street, Sydney NSW",
      source: "website",
      assignedToId: null,
    },
    create: {
      id: E2E_IDS.leadDealId,
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.leadContactId,
      title: "E2E Lead Leak Quote",
      stage: "NEW",
      address: "100 Lead Street, Sydney NSW",
      source: "website",
    },
  });

  await prisma.deal.upsert({
    where: { id: E2E_IDS.teamScheduledDealId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.scheduledContactId,
      title: "E2E Scheduled Hot Water Fix",
      stage: "SCHEDULED",
      jobStatus: "SCHEDULED",
      scheduledAt: tomorrow,
      address: "200 Schedule Street, Sydney NSW",
      latitude: -33.8688,
      longitude: 151.2093,
      assignedToId: E2E_IDS.teamUserId,
      source: "phone",
    },
    create: {
      id: E2E_IDS.teamScheduledDealId,
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.scheduledContactId,
      title: "E2E Scheduled Hot Water Fix",
      stage: "SCHEDULED",
      jobStatus: "SCHEDULED",
      scheduledAt: tomorrow,
      address: "200 Schedule Street, Sydney NSW",
      latitude: -33.8688,
      longitude: 151.2093,
      assignedToId: E2E_IDS.teamUserId,
      source: "phone",
    },
  });

  await prisma.deal.upsert({
    where: { id: E2E_IDS.ownerScheduledDealId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.ownerContactId,
      title: "E2E Owner Inspection",
      stage: "SCHEDULED",
      jobStatus: "SCHEDULED",
      scheduledAt: dayAfter,
      address: "300 Owner Street, Sydney NSW",
      latitude: -33.86,
      longitude: 151.21,
      assignedToId: E2E_IDS.ownerUserId,
      source: "referral",
    },
    create: {
      id: E2E_IDS.ownerScheduledDealId,
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.ownerContactId,
      title: "E2E Owner Inspection",
      stage: "SCHEDULED",
      jobStatus: "SCHEDULED",
      scheduledAt: dayAfter,
      address: "300 Owner Street, Sydney NSW",
      latitude: -33.86,
      longitude: 151.21,
      assignedToId: E2E_IDS.ownerUserId,
      source: "referral",
    },
  });

  await prisma.deal.upsert({
    where: { id: E2E_IDS.emailOnlyDealId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.emailOnlyContactId,
      title: "E2E Email Only Repair Quote",
      stage: "NEW",
      address: "400 Email Street, Sydney NSW",
      source: "email",
      assignedToId: null,
    },
    create: {
      id: E2E_IDS.emailOnlyDealId,
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.emailOnlyContactId,
      title: "E2E Email Only Repair Quote",
      stage: "NEW",
      address: "400 Email Street, Sydney NSW",
      source: "email",
    },
  });

  await prisma.deal.upsert({
    where: { id: E2E_IDS.phoneOnlyDealId },
    update: {
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.phoneOnlyContactId,
      title: "E2E Phone Only Urgent Callback",
      stage: "NEW",
      address: "500 Phone Street, Sydney NSW",
      source: "phone",
      assignedToId: null,
    },
    create: {
      id: E2E_IDS.phoneOnlyDealId,
      workspaceId: E2E_IDS.workspaceId,
      contactId: E2E_IDS.phoneOnlyContactId,
      title: "E2E Phone Only Urgent Callback",
      stage: "NEW",
      address: "500 Phone Street, Sydney NSW",
      source: "phone",
    },
  });

  await prisma.activity.deleteMany({
    where: {
      OR: [
        { contactId: E2E_IDS.scheduledContactId },
        { contactId: E2E_IDS.leadContactId },
        { contactId: E2E_IDS.emailOnlyContactId },
        { contactId: E2E_IDS.phoneOnlyContactId },
        { dealId: E2E_IDS.teamScheduledDealId },
        { dealId: E2E_IDS.leadDealId },
        { dealId: E2E_IDS.emailOnlyDealId },
        { dealId: E2E_IDS.phoneOnlyDealId },
      ],
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        type: "NOTE",
        title: "Inbound",
        content: "Hi, I need help with the hot water system at my place.",
        contactId: E2E_IDS.scheduledContactId,
        dealId: E2E_IDS.teamScheduledDealId,
      },
      {
        type: "NOTE",
        title: "Reply",
        content: "Booked in for tomorrow morning. Tracey will keep you posted.",
        contactId: E2E_IDS.scheduledContactId,
        dealId: E2E_IDS.teamScheduledDealId,
        userId: E2E_IDS.ownerUserId,
      },
      {
        type: "NOTE",
        title: "Inbound",
        content: "Can I get a quote for a leaking tap?",
        contactId: E2E_IDS.leadContactId,
        dealId: E2E_IDS.leadDealId,
      },
      {
        type: "NOTE",
        title: "Inbound",
        content: "Can you email me the repair options? My phone is tied up onsite.",
        contactId: E2E_IDS.emailOnlyContactId,
        dealId: E2E_IDS.emailOnlyDealId,
      },
      {
        type: "NOTE",
        title: "Inbound",
        content: "Please text me back urgently about the callback window.",
        contactId: E2E_IDS.phoneOnlyContactId,
        dealId: E2E_IDS.phoneOnlyDealId,
      },
    ],
  });

  const portalToken = createPublicJobPortalToken({
    dealId: E2E_IDS.teamScheduledDealId,
    contactId: E2E_IDS.scheduledContactId,
    workspaceId: E2E_IDS.workspaceId,
    expiresInDays: 7,
  });

  await fs.writeFile(
    path.join(authDir, "fixtures.json"),
    JSON.stringify(
      {
        baseURL,
        portalPath: `/portal/${portalToken}`,
        dbAvailable: true,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

export default async function globalSetup() {
  await fs.mkdir(authDir, { recursive: true });
  let dbAvailable = true;
  try {
    await ensureDatabase();
    await seed();
  } catch (error) {
    dbAvailable = false;
    await fs.writeFile(
      path.join(authDir, "fixtures.json"),
      JSON.stringify(
        {
          baseURL,
          portalPath: "/portal-preview",
          dbAvailable: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
  }
  await writeStorageState("admin.json", E2E_IDS.ownerUserId);
  await writeStorageState("team.json", E2E_IDS.teamUserId);
}
