"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logging";
import { sendProvisionedWelcomeSmsIfNeeded } from "@/lib/welcome-sms";
import { ensureWorkspaceUserForAuth, getOrCreateWorkspace } from "./workspace-actions";
import { ensureWorkspaceProvisioned, type WorkspaceProvisioningStatus } from "@/lib/onboarding-provision";
import { summarizeWeeklyHours, type WeeklyHours } from "@/lib/working-hours";
import { Prisma } from "@prisma/client";
import { inferTimezoneFromAddress } from "@/lib/timezone";

// ─── Australian Phone Validation ────────────────────────────────

const auPhoneRegex = /^(\+?61|0)[2-578]\d{8}$|^04\d{8}$/;

function normaliseAuPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+61")) return cleaned;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  return cleaned;
}

// ─── Validation Schema ──────────────────────────────────────────

const ServiceItemSchema = z.object({
  serviceName: z.string().trim().min(1, "Service name is required"),
  callOutFee: z.number().min(0).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  traceyNotes: z.string().trim().optional(),
}).refine(data => {
  if (data.priceMin !== undefined && data.priceMax !== undefined) {
    return data.priceMin <= data.priceMax;
  }
  return true;
}, {
  message: "Minimum price cannot be greater than maximum price",
  path: ["priceMax"]
});

type ServiceItemInput = z.infer<typeof ServiceItemSchema>;

const DailyHoursSchema = z.object({
  open: z.boolean(),
  start: z.string().trim().min(1),
  end: z.string().trim().min(1),
});

const WeeklyHoursSchema = z.object({
  Mon: DailyHoursSchema,
  Tue: DailyHoursSchema,
  Wed: DailyHoursSchema,
  Thu: DailyHoursSchema,
  Fri: DailyHoursSchema,
  Sat: DailyHoursSchema,
  Sun: DailyHoursSchema,
});

const TraceyOnboardingSchema = z.object({
  // Step 1: Draft Contact Card
  ownerName: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().transform(normaliseAuPhone).refine(val => auPhoneRegex.test(val), "Invalid Australian phone number"),
  email: z.string().trim().email("Valid email required"),
  businessName: z.string().trim().min(1, "Business name is required"),
  websiteUrl: z.preprocess((val) => {
    if (!val || typeof val !== "string") return undefined;
    const trimmed = val.trim();
    if (trimmed === "") return undefined;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }, z.string().url("Invalid URL format").optional()),

  // Step 2: Autonomy Selector
  agentMode: z.enum(["EXECUTION", "DRAFT", "INFO_ONLY"]),

  // Step 3: Scrape Review & Business Deep-Dive
  tradeType: z.string().trim().min(1, "Trade type is required"),
  publicPhone: z.string().trim().optional(),
  publicEmail: z.string().trim().optional(),
  googleReviewUrl: z.preprocess((val) => {
    if (!val || typeof val !== "string") return undefined;
    const trimmed = val.trim();
    if (trimmed === "") return undefined;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }, z.string().url("Invalid Google review URL").optional()),
  physicalAddress: z.string().trim().min(1, "Physical address is required"),
  serviceRadius: z.number().min(1).max(200).default(20),
  standardWorkHours: z.string().trim().min(1),
  weeklyHours: WeeklyHoursSchema.optional(),
  emergencyService: z.boolean().default(false),
  emergencySurcharge: z.number().min(0).optional(),
  emergencyHandling: z.string().trim().optional(),
  specialNotes: z.string().trim().optional(),

  // Step 4: Services & Pricing
  globalCallOutFee: z.number().min(0).optional(),
  services: z.array(ServiceItemSchema).optional(),

  // Step 6: Provisioning
  referralSource: z.string().trim().optional(),
  acceptsMultilingual: z.boolean().default(false),
}).transform(data => {
  // Enforce emergency consistency
  if (!data.emergencyService) {
    data.emergencySurcharge = undefined;
    data.emergencyHandling = undefined;
  }
  return data;
});

export type TraceyOnboardingData = z.infer<typeof TraceyOnboardingSchema>;

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, unknown>;
}

function getFirstOpenHours(weeklyHours?: WeeklyHours) {
  if (!weeklyHours) return { start: "08:00", end: "17:00" }
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const) {
    if (weeklyHours[day]?.open) {
      return {
        start: weeklyHours[day].start || "08:00",
        end: weeklyHours[day].end || "17:00",
      };
    }
  }
  return { start: "08:00", end: "17:00" }
}

function deriveBaseSuburbFromAddress(address: string): string {
  const match = address.match(/([^,]+),?\s*(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)?\s*\d{4}/i);
  if (match?.[1]?.trim()) return match[1].trim();
  return address.trim();
}

async function persistProvisioningState(params: {
  workspaceId: string;
  status: WorkspaceProvisioningStatus;
  phoneNumber?: string;
  error?: string;
}) {
  const workspace = await db.workspace.findUnique({
    where: { id: params.workspaceId },
    select: { settings: true },
  });
  const settings = getWorkspaceSettings(workspace?.settings);

  await db.workspace.update({
    where: { id: params.workspaceId },
    data: {
      settings: {
        ...settings,
        onboardingProvisioningStatus: params.status,
        onboardingProvisionedNumber: params.phoneNumber ?? settings.onboardingProvisionedNumber ?? null,
        onboardingProvisioningError: params.error ?? null,
        onboardingProvisioningUpdatedAt: new Date().toISOString(),
      },
    },
  });
}

// ─── Pre-Provisioning Save ──────────────────────────────────────
// Persists just enough profile data for Twilio provisioning to work,
// called before the provisioning API fires on the last onboarding step.

export async function saveBusinessProfileForProvisioning(params: {
  businessName: string;
  physicalAddress: string;
  ownerName: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const { businessName, physicalAddress, ownerName, phone } = params;
  if (!businessName?.trim() || !physicalAddress?.trim()) {
    return { success: false, error: "Business name and physical address are required." };
  }

  const baseSuburb = deriveBaseSuburbFromAddress(physicalAddress);
  const workspaceTimezone = inferTimezoneFromAddress(physicalAddress);

  try {
    const workspace = await getOrCreateWorkspace(userId, {
      name: businessName,
      type: "TRADIE",
      industryType: "TRADES",
      location: physicalAddress,
    });

    const appUser = await ensureWorkspaceUserForAuth({
      workspaceId: workspace.id,
      role: "OWNER",
      name: ownerName,
      phone,
    });

    await db.workspace.update({
      where: { id: workspace.id },
      data: { location: physicalAddress, workspaceTimezone },
    });

    await db.businessProfile.upsert({
      where: { userId: appUser.id },
      create: {
        userId: appUser.id,
        businessName,
        physicalAddress,
        baseSuburb,
        tradeType: "General",
      },
      update: {
        businessName,
        physicalAddress,
        baseSuburb,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[saveBusinessProfileForProvisioning]", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to save profile" };
  }
}

export async function getProvisioningIntentForOnboarding(): Promise<{
  success: boolean;
  provisionPhoneNumberRequested: boolean;
  provisioningStatus: WorkspaceProvisioningStatus | null;
  error?: string;
}> {
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      success: false,
      provisionPhoneNumberRequested: false,
      provisioningStatus: null,
      error: "Not authenticated",
    };
  }

  try {
    const workspace = await getOrCreateWorkspace(userId);
    const persisted = await db.workspace.findUnique({
      where: { id: workspace.id },
      select: { settings: true },
    });
    const settings = getWorkspaceSettings(persisted?.settings);
    const provisionPhoneNumberRequested = settings.provisionPhoneNumberRequested === true;
    const rawStatus = typeof settings.onboardingProvisioningStatus === "string"
      ? (settings.onboardingProvisioningStatus as WorkspaceProvisioningStatus)
      : null;

    return {
      success: true,
      provisionPhoneNumberRequested,
      provisioningStatus: rawStatus,
    };
  } catch (error) {
    return {
      success: false,
      provisionPhoneNumberRequested: false,
      provisioningStatus: null,
      error: error instanceof Error ? error.message : "Failed to read provisioning intent",
    };
  }
}

// ─── Server Action ──────────────────────────────────────────────

export async function saveTraceyOnboarding(
  data: TraceyOnboardingData
): Promise<{
  success: boolean;
  error?: string;
  workspaceId?: string;
  phoneNumber?: string;
  leadsEmail?: string;
  provisioningError?: string;
  readiness?: { scrapeConfigured: boolean; commsConfigured: boolean };
}> {
  const parsed = TraceyOnboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const d = parsed.data;
  const baseSuburb = deriveBaseSuburbFromAddress(d.physicalAddress);
  const workspaceTimezone = inferTimezoneFromAddress(d.physicalAddress);
  const normalizedWeeklyHours = d.weeklyHours;
  const firstOpenHours = getFirstOpenHours(normalizedWeeklyHours);

  // Email: phone-only Supabase accounts often have no auth email — use onboarding email or stable fallback (same as workspace user bootstrap).
  const { getAuthUser } = await import("@/lib/auth");
  const authUser = await getAuthUser();
  const resolvedOwnerEmail =
    (authUser?.email?.trim() ? authUser.email.trim() : "") ||
    d.email.trim() ||
    `${userId}@phone-auth.local`;

  // Readiness checks (non-blocking)
  const readiness = {
    scrapeConfigured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    commsConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.LIVEKIT_API_KEY,
  };

  try {
    // Get or create workspace
    const workspace = await getOrCreateWorkspace(userId, {
      name: d.businessName,
      type: "TRADIE",
      industryType: "TRADES",
      location: d.physicalAddress,
    });
    const appUser = await ensureWorkspaceUserForAuth({
      workspaceId: workspace.id,
      role: "OWNER",
      name: d.ownerName,
      phone: d.phone,
      authUserIdOverride: userId,
    });

    // ── PHASE A: Transactional Core Writes ──
    await db.$transaction(async (tx) => {
      // 1. Update the canonical app User row for the signed-in owner.
      await tx.user.update({
        where: { id: appUser.id },
        data: {
          email: resolvedOwnerEmail,
          name: d.ownerName,
          phone: d.phone,
          workspaceId: workspace.id,
          role: "OWNER",
          hasOnboarded: false,
        },
      });

      // 2. Update Workspace
      const currentWorkspace = await tx.workspace.findUnique({
        where: { id: workspace.id },
        select: { settings: true },
      });
      const currentSettings = getWorkspaceSettings(currentWorkspace?.settings);
      const nextSettings = (
        {
          ...currentSettings,
          ...(normalizedWeeklyHours ? { weeklyHours: normalizedWeeklyHours } : {}),
          googleReviewUrl: d.googleReviewUrl ?? "",
        }
      ) as unknown as Prisma.InputJsonValue;

      await tx.workspace.update({
        where: { id: workspace.id },
        data: {
          name: d.businessName,
          type: "TRADIE",
          industryType: "TRADES",
          location: d.physicalAddress,
          workspaceTimezone,
          onboardingComplete: false,
          agentMode: d.agentMode,
          workingHoursStart: firstOpenHours.start,
          workingHoursEnd: firstOpenHours.end,
          callOutFee: d.globalCallOutFee ?? 0,
          settings: nextSettings,
        },
      });

      // 3. Upsert BusinessProfile
      const profile = await tx.businessProfile.upsert({
        where: { userId: appUser.id },
        create: {
          userId: appUser.id,
          tradeType: d.tradeType,
          website: d.websiteUrl || null,
          businessName: d.businessName,
          publicPhone: d.publicPhone || null,
          publicEmail: d.publicEmail || null,
          physicalAddress: d.physicalAddress,
          baseSuburb,
          serviceRadius: d.serviceRadius,
          standardWorkHours: normalizedWeeklyHours ? summarizeWeeklyHours(normalizedWeeklyHours) : d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencySurcharge || null,
          emergencyHandling: d.emergencyHandling || null,
          specialNotes: d.specialNotes || null,
          referralSource: d.referralSource || null,
          acceptsMultilingual: d.acceptsMultilingual,
        },
        update: {
          tradeType: d.tradeType,
          website: d.websiteUrl || null,
          businessName: d.businessName,
          publicPhone: d.publicPhone || null,
          publicEmail: d.publicEmail || null,
          physicalAddress: d.physicalAddress,
          baseSuburb,
          serviceRadius: d.serviceRadius,
          standardWorkHours: normalizedWeeklyHours ? summarizeWeeklyHours(normalizedWeeklyHours) : d.standardWorkHours,
          emergencyService: d.emergencyService,
          emergencySurcharge: d.emergencySurcharge || null,
          emergencyHandling: d.emergencyHandling || null,
          specialNotes: d.specialNotes || null,
          referralSource: d.referralSource || null,
          acceptsMultilingual: d.acceptsMultilingual,
        },
      });

      // 4. Persist Service Items
      if (d.services && d.services.length > 0) {
        const validServices = d.services.filter((s: ServiceItemInput) => s.serviceName);

        if (validServices.length > 0) {
          // Clear old service items for this profile
          await tx.serviceItem.deleteMany({
            where: { businessProfileId: profile.id },
          });

          await tx.serviceItem.createMany({
            data: validServices.map((s: ServiceItemInput) => ({
              businessProfileId: profile.id,
              serviceName: s.serviceName,
              callOutFee: s.callOutFee ?? d.globalCallOutFee ?? null,
              priceMin: s.priceMin ?? null,
              priceMax: s.priceMax ?? null,
              traceyNotes: s.traceyNotes || null,
            })),
          });

          // Idempotency: Clear old onboarding knowledge for this workspace
          await tx.businessKnowledge.deleteMany({
            where: {
              workspaceId: workspace.id,
              category: "SERVICE",
              source: "onboarding"
            }
          });

          // Add to knowledge base for AI triage
          await tx.businessKnowledge.createMany({
            data: validServices.map((s: ServiceItemInput) => {
              let priceRange = "";
              if (s.priceMin && s.priceMax) priceRange = `$${s.priceMin} - $${s.priceMax}`;
              else if (s.priceMin) priceRange = `From $${s.priceMin}`;
              else if (s.priceMax) priceRange = `Up to $${s.priceMax}`;

              return {
                workspaceId: workspace.id,
                category: "SERVICE" as const,
                ruleContent: s.serviceName,
                source: "onboarding",
                metadata: {
                  priceRange: priceRange || null,
                  traceyNotes: s.traceyNotes || null,
                },
              };
            }),
          });

          // Idempotency: Clear old repair items with matching titles
          const serviceNames = validServices.map(s => s.serviceName);
          await tx.repairItem.deleteMany({
            where: {
              workspaceId: workspace.id,
              title: { in: serviceNames }
            }
          });

          // Add to repair items / glossary for quoting
          await tx.repairItem.createMany({
            data: validServices.map((s: ServiceItemInput) => {
              let desc = "";
              if (s.priceMin && s.priceMax) desc = `$${s.priceMin} - $${s.priceMax}`;
              else if (s.priceMin) desc = `From $${s.priceMin}`;
              else if (s.priceMax) desc = `Up to $${s.priceMax}`;

              return {
                workspaceId: workspace.id,
                title: s.serviceName,
                description: desc || "Price varies on assessment",
              };
            }),
          });
        }
      }

      // 5. Create PricingSettings
      await tx.pricingSettings.upsert({
        where: { userId: appUser.id },
        create: {
          userId: appUser.id,
          mode: "STANDARD",
          callOutFee: d.globalCallOutFee || null,
          waiveFee: true,
        },
        update: {
          mode: "STANDARD",
          callOutFee: d.globalCallOutFee || null,
          waiveFee: true,
        },
      });
    });

    // ── PHASE B: Best-Effort External Side Effects ──

    // 6. Allocate leads email
    let leadsEmail: string | undefined;
    try {
      const { getOrAllocateLeadCaptureEmail } = await import("@/actions/settings-actions");
      leadsEmail = await getOrAllocateLeadCaptureEmail();
    } catch (err) {
      logger.error("Failed to allocate leads email", { error: String(err), workspaceId: workspace.id });
    }

    // 7. Resolve Twilio number through the centralized billing-gated provisioning path
    let phoneNumber: string | undefined;
    let provisioningError: string | undefined;
    let provisioningStatus: WorkspaceProvisioningStatus = "failed";
    try {
      const existingWorkspace = await db.workspace.findUnique({
        where: { id: workspace.id },
        select: { twilioPhoneNumber: true },
      });

      if (existingWorkspace?.twilioPhoneNumber) {
        phoneNumber = existingWorkspace.twilioPhoneNumber;
        provisioningStatus = "already_provisioned";
        await persistProvisioningState({
          workspaceId: workspace.id,
          status: "already_provisioned",
          phoneNumber,
        });
      } else {
        const result = await ensureWorkspaceProvisioned({
          workspaceId: workspace.id,
          businessName: d.businessName,
          ownerPhone: d.phone,
          triggerSource: "onboarding-activation",
        });
        provisioningStatus = result.provisioningStatus;
        if (result.success && result.phoneNumber) {
          phoneNumber = result.phoneNumber;
          await persistProvisioningState({
            workspaceId: workspace.id,
            status: result.provisioningStatus,
            phoneNumber,
          });
        } else {
          provisioningError = result.error || "Tracey's phone number must be provisioned before activation.";
          await persistProvisioningState({
            workspaceId: workspace.id,
            status: result.provisioningStatus,
            error: provisioningError,
          });
          logger.error("Comms provisioning was unavailable during Tracey onboarding activation", {
            workspaceId: workspace.id,
            error: provisioningError,
            stageReached: result.stageReached,
            mode: result.mode,
            provisioningStatus: result.provisioningStatus,
          });
        }
      }
    } catch (err) {
      provisioningError = err instanceof Error ? err.message : "Unknown error";
      provisioningStatus = "failed";
      await persistProvisioningState({
        workspaceId: workspace.id,
        status: "failed",
        error: provisioningError,
      });
      logger.error("Comms provisioning threw during Tracey onboarding", {
        workspaceId: workspace.id,
        error: provisioningError,
      });
    }

    const allowActivationWithoutNumber = provisioningStatus === "not_requested";

    if (!phoneNumber && !allowActivationWithoutNumber) {
      return {
        success: false,
        error: provisioningError || "Tracey's phone number must be provisioned before activation.",
        workspaceId: workspace.id,
        leadsEmail,
        provisioningError,
        readiness,
      };
    }

    if (phoneNumber) {
      try {
        await sendProvisionedWelcomeSmsIfNeeded({
          workspaceId: workspace.id,
          businessName: d.businessName,
          ownerPhone: d.phone,
        });
      } catch (welcomeError) {
        logger.error("Failed to send Tracey welcome SMS", {
          workspaceId: workspace.id,
          error: welcomeError instanceof Error ? welcomeError.message : String(welcomeError),
        });
      }
    }

    const workspaceWithSettings = await db.workspace.findUnique({
      where: { id: workspace.id },
      select: { settings: true },
    });
    const settings = getWorkspaceSettings(workspaceWithSettings?.settings);

    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        onboardingComplete: true,
        settings: {
          ...settings,
          onboardingProvisioningStatus: allowActivationWithoutNumber ? "not_requested" : "provisioned",
          onboardingProvisionedNumber: phoneNumber ?? null,
          onboardingProvisioningError: allowActivationWithoutNumber ? provisioningError : null,
          onboardingActivatedAt: new Date().toISOString(),
        },
      },
    });
    await db.user.update({
      where: { id: appUser.id },
      data: { hasOnboarded: true },
    });

    revalidatePath("/crm", "layout");

    return {
      success: true,
      workspaceId: workspace.id,
      phoneNumber,
      leadsEmail,
      provisioningError,
      readiness,
    };
  } catch (error) {
    logger.error("Failed to save Tracey onboarding data", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save onboarding data",
    };
  }
}
